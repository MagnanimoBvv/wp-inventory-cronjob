const axios = require('axios');
const { getProductByHandle, updateInventory, updateVariants, applyRestockTag } = require('./shopifyFunctions');

async function getCdoProduct(code) {
    const response = await axios.get(
        `http://api.mexico.cdopromocionales.com/v2/products/${code}`,
        {
            params: {
                auth_token: process.env.CDO_AUTH_TOKEN,
            },
        }
    );

    return response.data;
}

async function updateCdoProducts(locationId, selectedKeys) {
    for (const key of selectedKeys) {
        const product = await getCdoProduct(key);
        const vendorVariants = product.variants;
        try {
            // if (key !== 'K7') continue; // If para pruebas con un producto específico
            const handle = `${product.name.replace(/["¨“”]/g, '').replace(/\s+/g, ' ')} ${product.code}`.trim().replace(/[\s&]+/g, '-'); // Quita comillas, dobles espacios y reemplaza espacios y ampersand
            const shopifyProduct = await getProductByHandle(handle);

            let restocked = false; // Se vuelve true si alguna variante sube de inventario
            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const color = vendorVariant.color.name.toUpperCase();
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === color);

                // for (const variant of colorVariants) {
                //     const variantToUpdate = {
                //         id: variant.id,
                //         inventoryItem: {
                //             sku: vendorVariant.sku,
                //         },
                //     }
                //     const response = await updateVariants(shopifyProduct.id, [variantToUpdate]);
                //     console.log('Variante actualizada:', response);
                // }
                // continue;

                const variantInventory = vendorVariant.stock_available;
                console.log(`Inventario color ${color}: ${variantInventory}`);

                for (const variant of colorVariants) {
                    const variantQuantity = parseInt(variant.selectedOptions.find(v => v.name === 'Cantidad').value);
                    const newQuantity = variantInventory >= variantQuantity ? 1 : 0;
                    console.log(`Variante encontrada: ${shopifyProduct.title} ${variant.title} Inventario: Prev ${variant.inventoryQuantity} Now ${newQuantity}`);
                    if (variant.inventoryQuantity !== newQuantity) {
                        if (newQuantity > variant.inventoryQuantity) restocked = true;
                        const variantToUpdate = {
                            quantities: {
                                inventoryItemId: variant.inventoryItem.id,
                                locationId,
                                quantity: newQuantity,
                            },
                            name: "available",
                            reason: "correction",
                            ignoreCompareQuantity: true, //Desactiva la comparación de inventario para siempre sobreescribir con la info del proveedor
                        };
                        const response = await updateInventory(variantToUpdate);
                        console.log('Inventario actualizado:', response.changes);
                    }
                }
            }

            await applyRestockTag(shopifyProduct, restocked);
        } catch (error) {
            console.error(`Error actualizando el producto ${key} de CDO:`, error);
        }
    }
}

module.exports = { updateCdoProducts };