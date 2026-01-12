const axios = require('axios');
const { getProductByHandle, updateInventory } = require('./shopifyFunctions');

async function getIusbProducts() {
    const response = await axios.get(
        process.env.IUSB_URL
    );

    return response.data;
}

async function updateIusbProducts(locationId, selectedKeys) {
    const responseProducts = await getIusbProducts();

    for (const key of selectedKeys) {
        const vendorVariants = responseProducts.data.filter(p => p.sku.includes(key));
        const product = vendorVariants[0];
        try {
            // if (key !== 'BP-235') continue; // If para pruebas con un producto específico
            const handle = `${product.nombre} ${key}`.trim().toLocaleLowerCase().replace(/[\s/]+/g, '-'); // Reemplaza espacios y diagonales
            const shopifyProduct = await getProductByHandle(handle);

            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const color = vendorVariant.variante.toUpperCase();
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === color);

                const variantInventory = vendorVariant.inventario;
                console.log(`Inventario color ${color}: ${variantInventory}`);

                for (const variant of colorVariants) {
                    const variantQuantity = parseInt(variant.selectedOptions.find(v => v.name === 'Cantidad').value);
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
            console.error(`Error actualizando el producto ${product.nombre} ${key}:`, error);
        }
    }
}

module.exports = { updateIusbProducts };