const axios = require('axios');

// ----- Configuración de la etiqueta "resurtido" -----
const RESTOCK_TAG = 'resurtido';
const RESTOCK_TAG_DAYS = 7; // Días que se mantiene la etiqueta antes de eliminarse. Cambia este valor para ajustar el vencimiento.
const RESTOCK_METAFIELD_NAMESPACE = 'custom';
const RESTOCK_METAFIELD_KEY = 'vencimiento_resurtido';
// ----------------------------------------------------

async function getLocationId() {
    const response = await axios.post(
        process.env.GRAPHQL_URL,
        JSON.stringify({
            query: `
                query {
                    locations(first: 10) {
                        nodes {
                            id
                            name
                        }
                    }
                }
            `,
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            }
        }
    );

    return response.data.data.locations.nodes[0].id;
}

async function getProductByHandle(handle) {
    const response = await axios.post(
        process.env.GRAPHQL_URL,
        JSON.stringify({
            query: `
                query {
                    productByHandle(handle: "${handle}") {
                        id
                        title
                        tags
                        metafield(namespace: "${RESTOCK_METAFIELD_NAMESPACE}", key: "${RESTOCK_METAFIELD_KEY}") {
                            value
                        }
                        variants(first: 250) {
                            nodes {
                                id
                                title
                                inventoryQuantity
                                inventoryItem {
                                    id
                                }
                                selectedOptions {
                                    name
                                    value
                                }
                            }
                        }
                    }
                }
            `,
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            }
        }
    );

    return response.data.data.productByHandle;
}

async function updateInventory(input) {
    const response = await axios.post(
        process.env.GRAPHQL_URL,
        JSON.stringify({
            query: `
                mutation InventorySet($input: InventorySetQuantitiesInput!) {
                    inventorySetQuantities(input: $input) {
                        inventoryAdjustmentGroup {
                            changes {
                                delta
                                name
                            }
                        }
                        userErrors {
                            message
                            field
                        }
                    }
                }
            `,
            variables: {
                input,
            }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            }
        }
    );

    return response.data.data.inventorySetQuantities.inventoryAdjustmentGroup;
}

async function updateVariants(productId, variants) {
    const response = await axios.post(
        process.env.GRAPHQL_URL,
        JSON.stringify({
            query: `
                mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                        productVariants {
                            displayName
                            inventoryItem {
                                sku
                            }
                        }
                        userErrors {
                            message
                            field
                        }
                    }
                }
            `,
            variables: {
                productId,
                variants,
            }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            }
        }
    );
    console.log("Variant update errors:", response.data.data.productVariantsBulkUpdate.userErrors);

    return response.data.data.productVariantsBulkUpdate.productVariants;
}

async function addProductTags(productId, tags) {
    const response = await axios.post(
        process.env.GRAPHQL_URL,
        JSON.stringify({
            query: `
                mutation tagsAdd($id: ID!, $tags: [String!]!) {
                    tagsAdd(id: $id, tags: $tags) {
                        userErrors {
                            message
                            field
                        }
                    }
                }
            `,
            variables: {
                id: productId,
                tags,
            }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            }
        }
    );

    return response.data.data.tagsAdd.userErrors;
}

async function removeProductTags(productId, tags) {
    const response = await axios.post(
        process.env.GRAPHQL_URL,
        JSON.stringify({
            query: `
                mutation tagsRemove($id: ID!, $tags: [String!]!) {
                    tagsRemove(id: $id, tags: $tags) {
                        userErrors {
                            message
                            field
                        }
                    }
                }
            `,
            variables: {
                id: productId,
                tags,
            }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            }
        }
    );

    return response.data.data.tagsRemove.userErrors;
}

async function setRestockExpiry(productId, expiryISO) {
    const response = await axios.post(
        process.env.GRAPHQL_URL,
        JSON.stringify({
            query: `
                mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
                    metafieldsSet(metafields: $metafields) {
                        userErrors {
                            message
                            field
                        }
                    }
                }
            `,
            variables: {
                metafields: [
                    {
                        ownerId: productId,
                        namespace: RESTOCK_METAFIELD_NAMESPACE,
                        key: RESTOCK_METAFIELD_KEY,
                        type: 'date_time',
                        value: expiryISO,
                    }
                ],
            }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            }
        }
    );

    return response.data.data.metafieldsSet.userErrors;
}

// Aplica la lógica de la etiqueta "resurtido" a un producto.
// - restocked === true: el inventario subió en esta corrida -> agrega la etiqueta (si falta)
//   y (re)establece la fecha de vencimiento a N días a partir de ahora.
// - restocked === false: si el producto ya tiene la etiqueta y la fecha de vencimiento ya pasó
//   (o no existe), se elimina la etiqueta para mantener la colección actualizada.
async function applyRestockTag(shopifyProduct, restocked) {
    const hasTag = (shopifyProduct.tags || []).includes(RESTOCK_TAG);

    if (restocked) {
        const expiry = new Date(Date.now() + RESTOCK_TAG_DAYS * 24 * 60 * 60 * 1000);
        await setRestockExpiry(shopifyProduct.id, expiry.toISOString());
        if (!hasTag) {
            await addProductTags(shopifyProduct.id, [RESTOCK_TAG]);
            console.log(`Etiqueta "${RESTOCK_TAG}" agregada a ${shopifyProduct.title} (vence ${expiry.toISOString()})`);
        } else {
            console.log(`Vencimiento de "${RESTOCK_TAG}" renovado en ${shopifyProduct.title} (vence ${expiry.toISOString()})`);
        }
    } else if (hasTag) {
        const expiryValue = shopifyProduct.metafield && shopifyProduct.metafield.value;
        if (!expiryValue || new Date(expiryValue) <= new Date()) {
            await removeProductTags(shopifyProduct.id, [RESTOCK_TAG]);
            console.log(`Etiqueta "${RESTOCK_TAG}" eliminada de ${shopifyProduct.title} (vencida)`);
        }
    }
}

module.exports = { getLocationId, getProductByHandle, updateInventory, updateVariants, applyRestockTag };