const axios = require('axios');
const cheerio = require('cheerio');
const { getProductByHandle, updateInventory } = require('./shopifyFunctions');

const urls = {
    'MAL 206': 'https://www.impressline.com.mx/back-packs-subcat/backpack-bikila-mal-206',
    'MAL 223': 'https://www.impressline.com.mx/back-packs-subcat/cangurera-o-neal-mal-223',
    'MAL 116': 'https://www.impressline.com.mx/hieleras-y-porta-bebidas-subcat/lonchera-evans-mal-116',
    'ESC 526': 'https://www.impressline.com.mx/escritorio-premium-libretas-subcat/libreta-alcala-esc-526',
    'TEC 102': 'https://www.impressline.com.mx/porta-ipads/mousepad-planck-tec-102',
}

async function getDomFromUrl(url) {
    const response = await axios.get(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
        },
        timeout: 15000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    return $;
}

async function processData(key) {
    const url = urls[key];
    const $ = await getDomFromUrl(url);

    const specs = {};
    $('tr.tr-table-specs').each((_, tr) => {
        const key = $(tr).find('td').first().text().trim().replace(':', '');
        const value = $(tr).find('td').last().text().trim();

        specs[key] = value;
    });

    const name = specs['Nombre'];
    const model = specs['Clave'];

    const colors = $('.color-chooser .product-color-option')
        .map((_, el) => {
            const color = $(el).find('.color-name').text().trim().toUpperCase();
            const stock = parseInt(
                $(el).find('.stock-label-product-mini').text().trim(),
                10
            );

            return { color, stock };
        })
        .get();

    return {
        name,
        model,
        colors,
    };
}

async function updateImpresslineProducts(locationId, selectedKeys) {
    for (const key of selectedKeys) {
        const product = await processData(key);
        const vendorVariants = product.colors;
        try {
            // if (key !== 'MAL 206') continue; // If para pruebas con un producto específico
            const handle = `${product.name} ${product.model}`.toLowerCase().replace(/['’\s]+/g, '-'); // Reemplaza espacios y apóstrofes
            const shopifyProduct = await getProductByHandle(handle);

            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const color = vendorVariant.color;
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === color);

                const variantInventory = vendorVariant.stock;
                console.log(`Inventario color ${color}: ${variantInventory}`);

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
            console.error(`Error actualizando el producto ${product.NOMBRE}:`, error);
        }
    }
}

module.exports = { updateImpresslineProducts };