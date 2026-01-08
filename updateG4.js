const axios = require('axios');
const xml2js = require('xml2js');
const { getProductByHandle, updateInventory } = require('./shopifyFunctions');

async function getG4Products() {
    const soapBody = `<?xml version="1.0" encoding="ISO-8859-1"?>
    <SOAP-ENV:Envelope
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:urn="urn:getProductStockwsdl"
    SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
        <SOAP-ENV:Body>
            <urn:getProductStock>
                <user xsi:type="xsd:string">${process.env.G4_USER}</user>
                <key xsi:type="xsd:string">${process.env.G4_KEY}</key>
            </urn:getProductStock>
        </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`;

    const response = await axios.post(
        'https://distr.ws.g4mexico.com/index.php',
        soapBody,
        {
            headers: {
                'Content-Type': 'text/xml; charset=ISO-8859-1',
                'SOAPAction': '"urn:getProductStockwsdl#getProductStock"',
            },
        }
    );

    const soapParsed = await xml2js.parseStringPromise(response.data, {
        explicitArray: false,
    });
    const base64 = soapParsed['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:getProductStockResponse'].return._;
    const decodedXml = Buffer.from(base64, 'base64').toString('utf8');
    const parsed = await xml2js.parseStringPromise(decodedXml, {
        explicitArray: false,
        mergeAttrs: true,
    });


    return parsed.response.producto;
}

async function updateG4Products(locationId, selectedKeys) {
    const responseProducts = await getG4Products();

    for (const key of selectedKeys) {
        if (['lib-fab', 'tap-duo-lli', 'usb-tec', 'jet-met'].includes(key)) continue;
        const vendorVariants = responseProducts.filter(p => p.codigo_producto.startsWith(key));
        const product = vendorVariants[0];
        try {
            // if (key !== 'BP-235') continue; // If para pruebas con un producto específico
            let initString = ['Boligrafos de Plastico', 'Boligrafos de Metal'].includes(product.linea) ? 'Bolígrafo' :
                product.linea === 'Electronico' ? 'Power Bank' : '';
            const handle = `${initString} ${product.nombre_producto} ${key}`.trim().toLocaleLowerCase().replace(/[.,]/g, '').replace(/[\s/]+/g, '-'); // Quita comas y puntos y reemplaza espacios y diagonales
            const shopifyProduct = await getProductByHandle(handle);

            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const vendorVariant of vendorVariants) {
                const color = vendorVariant.nombre_color.toUpperCase();
                const colorVariants = shopifyVariants.filter(v => v.selectedOptions.find(v => v.name === 'Color').value === color);

                const variantInventory = parseInt(vendorVariant.existencias, 10);
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
            console.error(`Error actualizando el producto ${product.nombre_producto} ${key}:`, error);
        }
    }
}

module.exports = { updateG4Products };