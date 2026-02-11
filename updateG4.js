const axios = require('axios');
const xml2js = require('xml2js');
const { getProductByHandle, updateInventory } = require('./shopifyFunctions');

const handles = {
    "moc-dai": "mochila-takayama-daily-pack-moc-dai",
    "anf-lin": "anfora-link-anf-lin",
    "vas-ven": "vaso-venti-vas-ven",
    "set-pop": "",
    "anf-cav": "anfora-cava-anf-cav",
    "anf-tan": "anfora-tanker-anf-tan",
    "ter-kri": "termo-krypton-ter-kri",
    "ter-tin": "termo-tiny-ter-tin",
    "anf-lit": "anfora-link-terra-anf-lit",
    "vas-bis": "vaso-bistro-vas-bis",
    "vas-bca": "vaso-bistro-candy-acero-vas-bca",
    "anf-ele": "anfora-element-anf-ele",
    "anf-sou": "anfora-soul-anf-sou",
    "vas-bla": "vaso-termico-black-vas-bla",
    "anf-sta": "anfora-stahl-anf-sta",
    "moc-lok": "mochila-takayama-lok-moc-lok",
    "moc-urb": "mochila-wagner-urban-moc-urb",
    "moc-spa": "mochila-wagner-space-moc-spa",
    "moc-rol": "mochila-takayama-roller-moc-rol",
    "moc-zen": "mochila-takayama-zen-moc-zen",
    "moc-mai": "mochila-takayama-maiko-moc-mai",
    "moc-tas": "mochila-wagner-task-moc-tas",
    "moc-atd": "mochila-takayama-atomik-deluxe-moc-atd",
    "moc-rak": "mochila-takayama-rak-moc-rak",
    "moc-tai": "mochila-takayama-taiko-moc-tai",
    "moc-dia": "mochila-takayama-diagonal-moc-dia",
    "moc-sac": "mochila-takayama-sack-moc-sac",
    "fun-iiq": "funda-laptop-takyama-iq-fun-iiq",
    "lin-med": "linterna-medic-lin-med",
    "lin-san": "linterna-sante-lin-san",
    "lib-pea": "libreta-peach-lib-pea",
    "lib-tre": "libreta-trend-lib-tre",
    "lib-fab": "",
    "lib-skd": "libreta-skin-dots-lib-skd",
    "lib-skb": "libreta-skin-box-lib-skb",
    "lib-sks": "libreta-skin-soft-lib-sks",
    "lib-pes": "libreta-peach-spiral-lib-pes",
    "lib-bor": "libreta-border-lib-bor",
    "lib-bob": "libreta-border-black-lib-bob",
    "lib-ski": "libreta-skin-lib-ski",
    "lib-smt": "libreta-skin-metallics-lib-smt",
    "lib-smi": "libreta-skin-mini-lib-smi",
    "lib-vel": "libreta-velvet-lib-vel",
    "lib-bio": "libreta-bio-lemongrass-lib-bio",
    "lib-rok": "libreta-rock-lib-rok",
    "lib-pok": "libreta-pocket-lib-pok",
    "car-skc": "carpeta-skin-congress-car-skc",
    "tap-duo-lli": "",
    "set-rec": "set-de-recaditos-set-rec",
    "set-re2": "set-de-recaditos-2-set-re2",
    "usb-tec": "",
    "lum-al4": "power-bank-lumina-4-lum-al4",
    "pce-tec": "porta-celular-tech-pce-tec",
    "kbi-son": "boligrafo-koi-bio-tinta-negra-kbi-son",
    "ebc-trn": "boligrafo-epic-colors-bio-tinta-negra-ebc-trn",
    "kbi-trn": "boligrafo-koi-bio-trans-tinta-negra-kbi-trn",
    "bug-sol": "boligrafo-buggy-bug-sol",
    "col-tra": "boligrafo-colors-col-tra",
    "jel-mlk": "boligrafo-jello-jel-mlk",
    "jel-tra": "boligrafo-jello-jel-tra",
    "jel-eli": "boligrafo-jello-elite-jel-eli",
    "jel-zen": "boligrafo-jello-zen-jel-zen",
    "jum-sol": "boligrafo-jumbo-max-jum-sol",
    "lob-so2": "boligrafo-lobby-2-lob-so2",
    "spl-sol": "boligrafo-splash-spl-sol",
    "sur-pla": "boligrafo-surf-touch-sur-pla",
    "due-sra": "boligrafo-duet-solida-tinta-roja-azul-due-sra",
    "due-trn": "boligrafo-duet-trans-tinta-roja-negra-due-trn",
    "dak-roc": "boligrafo-dakar-rock-dak-roc",
    "sha-met": "boligrafo-sharp-sha-met",
    "bol-met": "boligrafo-bold-bol-met",
    "jet-met": "",
    "ari-met": "boligrafo-aria-ari-met",
    "cen-met": "boligrafo-century-cen-met",
    "dak-met": "boligrafo-dakar-dak-met",
    "dak-tou": "boligrafo-dakar-touch-dak-tou",
    "imp-neg": "boligrafo-imperial-imp-neg",
    "imp-sol": "boligrafo-imperial-imp-sol",
    "iss-met": "boligrafo-insignia-ss-iss-met",
    "kan-met": "boligrafo-kanji-kan-met",
    "mdv-met": "boligrafo-mondavi-mdv-met",
    "mdv-tou": "boligrafo-mondavi-touch-mdv-tou"
};

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
        if (['lib-fab', 'tap-duo-lli', 'usb-tec', 'jet-met', 'set-pop'].includes(key)) continue;
        const vendorVariants = responseProducts.filter(p => p.codigo_producto.startsWith(key));
        try {
            // if (key !== 'BP-235') continue; // If para pruebas con un producto específico
            const handle = handles[key];
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
            console.error(`Error actualizando el producto ${key} de G4:`, error);
        }
    }
}

module.exports = { updateG4Products };