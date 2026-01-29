const axios = require('axios');
const { getProductByHandle, updateInventory } = require('./shopifyFunctions');

const warehouses = [
    'Disponible Almacen 7',
    'Disponible Almacen 9',
    'Disponible Almacen 15',
    'Disponible Almacen 20',
    'Disponible Almacen 24',
];

async function getDobleVelaProduct(code) {
    const response = await axios.get(
        'http://srv-datos.dyndns.info/doblevela/service.asmx/GetExistencia',
        {
            params: {
                codigo: code,
                Key: process.env.DV_KEY,
            },
        }
    );

    return JSON.parse(response.data.match(/<string[^>]*>(.*)<\/string>/s)[1]);
}

async function updateDobleVelaProducts(locationId, selectedKeys) {
    for (const key of selectedKeys) {
        const response = await getDobleVelaProduct(key);
        const vendorVariants = response.Resultado
        const product = vendorVariants[0];
        try {
            // if (key !== 'A2659') continue; // If para pruebas con un producto específico
            const handle = `${product.NOMBRE.slice(0, product.NOMBRE.indexOf(product.MODELO) + product.MODELO.length).trim().toLowerCase().replace(/[.,]/g, '').replace(/[\s]+/g, '-')}`; // Quita comas y puntos y reemplaza espacios
            const shopifyProduct = await getProductByHandle(handle);

            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const color = vendorVariant.COLOR.split(' - ')[1];
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === color);

                const variantInventory = warehouses.reduce((acum, warehouse) => acum + vendorVariant[warehouse], 0); // Suma el inventario de todas las ubicaciones
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
            console.error(`Error actualizando el producto ${key} de Doble Vela:`, error);
        }
    }
}

module.exports = { updateDobleVelaProducts };