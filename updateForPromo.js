const axios = require('axios');
const { getProductByHandle, updateInventory } = require('./shopifyFunctions');

async function getForPromoProducts() {
    const response = await axios.get(
        'https://4promotional.net:9090/WsEstrategia/inventario'
    );

    return response.data;
}

async function updateForPromoProducts(locationId, selectedKeys) {
    const responseProducts = await getForPromoProducts();

    for (const key of selectedKeys) {
        if (['BL 058'].includes(key)) continue;
        const vendorVariants = responseProducts.filter(p => p.id_articulo === key);
        const product = vendorVariants[0];
        try {
            // if (key !== 'BP-235') continue; // If para pruebas con un producto específico
            const handle = `${product.descripcion.split(' ')[0]} ${product.nombre_articulo} ${product.id_articulo}`.trim().toLocaleLowerCase().replace(/[\s/]+/g, '-'); // Reemplaza espacios y diagonales
            const shopifyProduct = await getProductByHandle(handle);

            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === vendorVariant.color);

                const variantInventory = vendorVariant.inventario;
                console.log(`Inventario color ${vendorVariant.color}: ${variantInventory}`);

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
            console.error(`Error actualizando el producto ${key} de ForPromo:`, error);
        }
    }
}

module.exports = { updateForPromoProducts };