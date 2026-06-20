const axios = require('axios');
const { getProductByHandle, updateInventory, updateVariants, applyRestockTag } = require('./shopifyFunctions');

const handles = {
    "TE-045": "botella-byron-te-045",
    "TE-063": "cilindro-castelo-te-063",
    "TE-075": "botella-mezcladora-nerja-te-075",
    "TE-187": "termo-timbu-te-187",
    "TE-182": "botella-tamerici-te-182",
    "TE-153": "termo-mayadin-te-153",
    "TE-154": "termo-hama-te-154",
    "TE-140": "termo-ulan-te-140",
    "TE-087": "vaso-lleida-te-087",
    "TX-147": "maleta-vilar-tx-147",
    "TX-083": "maleta-rigida-dover-tx-083",
    "TX-149": "bolsa-sund-tx-149",
    "TX-141": "bolsa-jomala-tx-141",
    "TX-127": "bolsa-cosmetiquera-tx-127",
    "DK-109": "juego-de-notas-adhesivo-payoh-dk-109",
    "DK-120": "block-de-notas-biberg-dk-120",
    "DK-108": "organizador-abovyan-dk-108",
    "EX-060": "soporte-para-smartphone-ex-060",
    "BL-179": "boligrafo-most-bl-179",
    "BL-178": "boligrafo-lumio-bl-178",
    "BL-173": "boligrafo-marsala-bl-173",
    "BL-171": "boligrafo-orvieto-bl-171",
    "BL-156": "lapiz-infinito-bl-156",
    "BL-153": "boligrafo-surabaya-bl-153",
    "BL-150": "boligrafo-cracovia-bl-150",
    "PC-013": "boligrafo-kenge-pc-013",
    "BL-136": "boligrafo-en-aluminio-aragon-bl-136",
    "BL-139": "boligrafo-de-bambu-tudela-bl-139",
    "BL-096": "boligrafo-metalico-de-aluminio-zubay-bl-096",
    "BL-106": "boligrafo-de-acero-inoxidable-uruk-bl-106",
    "BL-121": "boligrafo-de-plastico-kiel-bl-121",
    "ST-038": "set-de-plumas-joal-st-038",
    "DK-107": "porta-documentos-bukit-dk-107",
    "DK-093": "tabla-porta-documentos-bitung-dk-093",
    "DK-094": "folder-bandung-dk-094",
    "DK-037": "tabla-de-plastico-con-clip-para-documentos-dk-037",
    "DK-074": "tabla-de-plastico-para-documentos-dk-074",
    "TE-218": "vaso-eslov-te-218",
    "TX-301": "bolsa-greit-tx-301",
    "TX-392": "bolsa-kotel-tx-392",
    "TX-378": "bolsa-yefren-tx-378",
    "DK-124": "set-infantil-watten-dk-124",
}

async function getInnovaProducts(page) {
    const response = await axios.get(
        'https://4vumtdis3m.execute-api.us-east-1.amazonaws.com/default/Innovation_GetAllProductos',
        {
            params: {
                User: process.env.INNOVA_USER,
                Clave: process.env.INNOVA_PASS,
                page,
                limit: 100,
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

async function getInnovaInventory() {
    const response = await axios.get(
        'https://1x4nyx8c80.execute-api.us-east-1.amazonaws.com/default/Innovation_GetAll_ProducLight',
        {
            params: {
                User: process.env.INNOVA_USER,
                Clave: process.env.INNOVA_PASS,
            },
            headers: {
                'auth-token': process.env.INNOVA_AUTH_TOKEN
            },
        }
    );

    return response.data;
}

async function updateInnovaProducts(locationId, selectedKeys) {
    const responseInventory = await getInnovaInventory();
    // const responseProducts = await paginateInnovaProducts();

    for (const key of selectedKeys) {
        const product = responseInventory.productos.find(p => p.Codigo === key);
        // const product = responseProducts.find(p => p.Codigo === key);
        try {
            // if (key !== 'TE-045') continue; // If para pruebas con un producto específico
            const vendorVariants = product.Variantes;

            const handle = handles[key];
            // const handle = `${product.Nombre.replace(/[.,]/g, '')} ${product.Codigo}`.trim().toLowerCase().replace(/[\s\/-]+/g, '-'); // Reemplaza espacios, diagonales y múltiples guiones
            const shopifyProduct = await getProductByHandle(handle);

            let restocked = false; // Se vuelve true si alguna variante sube de inventario
            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === vendorVariant.Tono);

                // for (const variant of colorVariants) {
                //     const variantToUpdate = {
                //         id: variant.id,
                //         inventoryItem: {
                //             sku: vendorVariant['Codigo Variante'],
                //         },
                //     }
                //     const response = await updateVariants(shopifyProduct.id, [variantToUpdate]);
                //     console.log('Variante actualizada:', response);
                // }
                // continue;

                const variantInventory = parseInt(vendorVariant.Stock);
                console.log(`Inventario color ${vendorVariant.Tono}: ${variantInventory}`);

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
            console.error(`Error actualizando el producto ${key} de Innova:`, error);
        }
    }
}

module.exports = { updateInnovaProducts };