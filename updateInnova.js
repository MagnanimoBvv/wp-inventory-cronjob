const axios = require('axios');
const { getProductByHandle, updateInventory } = require('./shopifyFunctions');

async function getInnovaProducts(page) {
    const response = await axios.get(
        'https://4vumtdis3m.execute-api.us-east-1.amazonaws.com/default/Innovation_GetAllProductos',
        {
            params: {
                User: process.env.INNOVA_USER,
                Clave: process.env.INNOVA_PASS,
                page,
                limit: 300,
            },
            headers: {
                'auth-token': process.env.INNOVA_AUTH_TOKEN
            },
        }
    );

    return response.data;
}

async function paginateInnovaProducts() {
    const firstResponse = await getInnovaProducts(1);
    let products = firstResponse.productos;
    const pages = firstResponse.paginas_totales;

    let page = 2;
    while (true) {
        const response = await getInnovaProducts(page);
        products = [...products, ...response.productos];

        if (page >= pages) {
            break;
        }

        page++;
    }
    return products;
}

async function updateInnovaProducts(locationId, selectedKeys) {
    const responseProducts = await paginateInnovaProducts();

    for (const key of selectedKeys) {
        const product = responseProducts.find(p => p.Codigo === key);
        try {
            // if (key !== 'TE-045') continue; // If para pruebas con un producto específico
            const vendorVariants = product.Variantes;

            const handle = `${product.Nombre.replace(/[.,]/g, '')} ${product.Codigo}`.trim().toLowerCase().replace(/[\s\/-]+/g, '-'); // Reemplaza espacios, diagonales y múltiples guiones
            const shopifyProduct = await getProductByHandle(handle);

            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === vendorVariant.Tono);

                const variantInventory = parseFloat(vendorVariant.Stock);
                console.log(`Inventario color ${vendorVariant.Tono}: ${variantInventory}`);

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
            console.error(`Error actualizando el producto ${product.Nombre} ${product.Codigo}:`, error);
        }
    }
}

module.exports = { updateInnovaProducts };