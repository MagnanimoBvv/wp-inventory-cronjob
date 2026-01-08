const axios = require('axios');
require('dotenv').config();
const { getLocationId } = require('./shopifyFunctions');
const { updatePromoOpcionProducts } = require('./updatePromoopcion');
const { updateInnovaProducts } = require('./updateInnova');
const { updateForPromoProducts } = require('./updateForPromo');
const { updateDobleVelaProducts } = require('./updateDobleVela');
const { updateImpresslineProducts } = require('./updateImpressline');
const { updateG4Products } = require('./updateG4');

const vendors = require('./vendors.json');

async function updateProducts() {
    const locationId = await getLocationId();
    for (const vendor of vendors) {
        // if (vendor.vendor !== 'FOR PROMO') continue;
        if (vendor.vendor === 'PROMO OPCION') {
            await updatePromoOpcionProducts(locationId, vendor.products);
        } else if (vendor.vendor === 'INNOVA') {
            await updateInnovaProducts(locationId, vendor.products);
        } else if (vendor.vendor === 'FOR PROMO') {
            await updateForPromoProducts(locationId, vendor.products);
        } else if (vendor.vendor === 'DOBLE VELA') {
            await updateDobleVelaProducts(locationId, vendor.products);
        } else if (vendor.vendor === 'IMPRESSLINE') {
            await updateImpresslineProducts(locationId, vendor.products);
        } else if (vendor.vendor === 'G4') {
            await updateG4Products(locationId, vendor.products);
        }
    }
}

updateProducts();