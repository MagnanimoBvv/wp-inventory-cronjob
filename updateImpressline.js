const axios = require('axios');
const { getProductByHandle, updateInventory } = require('./shopifyFunctions');

const handles = {
    'MAL 206': 'backpack-bikila-mal-206',
    'MAL 223': 'cangurera-o-neal-mal-223',
    'MAL 116': 'lonchera-evans-mal-116',
    'ESC 526': 'libreta-alcala-esc-526',
    'TEC 102': 'mousepad-planck-tec-102',
}

async function getImpresslineProducts() {
    const response = await axios.get(
            'https://www.impressline.com.mx/api/v1/stocks',
            {
                headers: {
                    'Authorization': `Bearer ${process.env.ILN_AUTH_TOKEN}`
                }
            }
        );

        return response.data;
}

async function updateImpresslineProducts(locationId, selectedKeys) {
    const responseProducts = await getImpresslineProducts();
    const products = responseProducts.data;

    for (const key of selectedKeys) {
        const vendorVariants = products.filter(p => p.clave.startsWith(key));
        try {
            // if (key !== 'MAL 206') continue; // If para pruebas con un producto específico
            const handle = handles[key];
            const shopifyProduct = await getProductByHandle(handle);

            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const color = vendorVariant.nombre.split(' - ')[1].toUpperCase();
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === color);

                const variantInventory = vendorVariant.stock;
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
            console.error(`Error actualizando el producto ${key} de Impressline:`, error);
        }
    }
}

module.exports = { updateImpresslineProducts };