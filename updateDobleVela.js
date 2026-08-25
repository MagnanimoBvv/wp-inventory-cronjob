const axios = require('axios');
const { getProductByHandle, updateInventory, updateVariants, applyRestockTag } = require('./shopifyFunctions');

const handles = {
    'A2659': 'maletín-porta-laptop-royal-a2659',
    'A2661': 'maletin-porta-laptop-wayne-a2661',
    'A2911': 'portalaptop-de-poliester-300d-office-a2911',
    'A2943': 'cangurera-deportiva-impermeable-jump-a2943',
    'A3116': 'bolsa-de-poliéster-con-asas-de-algodón-olivo-a3116',
    'A2922': 'libreta-con-cierre-zipper-a2922',
    'A2672': 'libreta-personal-a5-milan-a2672',
    'A3028': 'lámpara-de-escritorio-con-sensor-touch-dinner-a3028',
    'SLK13': 'portagafete-de-hilo-elastico-frank-slk13',
    'CC4261': 'calculadora-cordon-rec-cc4261',
    'A3139': 'batería-de-carga-rápida-cap-5000-mah-elegant-a3139',
    'A3137': 'batería-de-carga-rápida-cap-5000-mah-elixir-a3137',
    'A2899': 'antiestrés-de-martillo-hammer-a2899',
    'A2364': 'rompecabezas-planer-a2364',
    'A2365': 'rompecabezas-fish-a2365',
    'A2366': 'cubo-de-madera-7-piezas-sonri-a2366',
    'A3096': 'bolígrafo-de-plástico-multi-tintas-arcoíris-a3096',
    'BLP4189': 'bolígrafo-de-plástico-multi-tintas-bakú-blp4189',
    'A2955': 'boligrafo-de-aluminio-verdi-a2955',
    'TAC2310': 'tabla-con-calculadora-asentia-tac2310',
    'A2576': 'porta-documentos-de-plastico-secret-a2576',
    'A2577': 'tabla-de-madera-mdf-miles-a2577',
    'A3194': 'bolsa-de-poliéster-repelente-al-agua-keyla-a3194',
    'A2113': 'bolígrafo-de-aluminio-con-touch-oddra-a2113',
    'A2894': 'lampara-plegable-con-bateria-portatil-cap-1200-mah-pixar-a2894',
    'A2221': 'set-de-papeleria-trim-a2221',
    'A3097': 'libreta-a5-con-correa-mágnetica-bethoven-a3097',
    'A2490': 'muneco-de-peluche-oso-felpi-a2490',
    'A2543': 'muneco-de-peluche-oso-bubu-a2543',
}

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
        const vendorVariants = response.Resultado;
        try {
            // if (key !== 'A2659') continue; // If para pruebas con un producto específico
            const handle = handles[key];
            const shopifyProduct = await getProductByHandle(handle);

            let restocked = false; // Se vuelve true si alguna variante sube de inventario
            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const color = vendorVariant.COLOR.split(' - ')[1];
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === color);

                // for (const variant of colorVariants) {
                //     const variantToUpdate = {
                //         id: variant.id,
                //         inventoryItem: {
                //             sku: vendorVariant.CLAVE,
                //         },
                //     }
                //     const response = await updateVariants(shopifyProduct.id, [variantToUpdate]);
                //     console.log('Variante actualizada:', response);
                // }
                // continue;

                const variantInventory = warehouses.reduce((acum, warehouse) => acum + vendorVariant[warehouse], 0); // Suma el inventario de todas las ubicaciones
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
            console.error(`Error actualizando el producto ${key} de Doble Vela:`, error);
        }
    }
}

module.exports = { updateDobleVelaProducts };