const axios = require('axios');
const { getProductByHandle, updateInventory } = require('./shopifyFunctions');

async function getPromoOpcionProducts() {
    const response = await axios.post(
        'https://promocionalesenlinea.net/api/all-products',
        JSON.stringify({
            user: process.env.PO_USER,
            password: process.env.PO_PASS,
        }), {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );

    return response.data;
}

async function getVariantInventory(sku) {
    const response = await axios.post(
        'https://promocionalesenlinea.net/api/all-stocks',
        JSON.stringify({
            user: process.env.PO_USER,
            password: process.env.PO_PASS,
            sku,
        }), {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );

    return response.data;
}

async function updatePromoOpcionProducts(locationId, selectedKeys) {
    const response = await getPromoOpcionProducts();

    if (!response.success) return;

    const responseProducts = response.response;
    for (const key of selectedKeys) {
        const product = responseProducts.find(p => p.skuPadre === key);
        try {
            // if (key !== 'TMPS 148') continue; // If para pruebas con un producto específico
            const vendorVariants = product.hijos;

            const handle = `${product.nombrePadre} ${product.skuPadre}`.trim().toLowerCase().replace(/[\s/]+/g, '-').replace(/-+$/g, ''); // Reemplaza espacios y diagonales y quita guiones al final
            const shopifyProduct = await getProductByHandle(handle);

            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === vendorVariant.color);

                const responseInventory = await getVariantInventory(vendorVariant.skuHijo);
                const variantInventory = responseInventory.Stocks.reduce((acum, item) => acum + item.Stock, 0); // Suma el inventario de todas las ubicaciones
                console.log(`Inventario color ${vendorVariant.color}: ${variantInventory}`);

                for (const variant of colorVariants) {
                    const variantQuantity = parseFloat(variant.selectedOptions.find(v => v.name === 'Cantidad').value);
                    const newQuantity = variantInventory >= variantQuantity ? 1 : 0;
                    console.log(`Variante encontrada: ${shopifyProduct.title} ${variant.title} Inventario: Prev ${variant.inventoryQuantity} Now ${newQuantity}`);
                    if (variant.inventoryQuantity !== newQuantity) {
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
        } catch (error) {
            console.error(`Error actualizando el producto ${product.nombrePadre} ${product.skuPadre}:`, error);
        }
    }
}

module.exports = { updatePromoOpcionProducts };