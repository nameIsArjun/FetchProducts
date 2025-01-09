require("dotenv").config();
const axios = require("axios");
const minimist = require("minimist");

const storeConfig = {
    store: process.env.storeURL,
    version: process.env.apiVersion,
    adminToken: process.env.adminToken,
};

const apiURL = `${storeConfig.store}/admin/api/${storeConfig.version}/graphql.json`;

async function fetchProductsByName(productName) {
    const query = `
        query ($query: String!) {
            products(first: 10, query: $query) {
                edges {
                    node {
                        title
                        variants(first: 10) {
                            edges {
                                node {
                                    title
                                    price
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await axios.post(
            apiURL,
            { query, variables: { query: productName } },
            {
                headers: {
                    "X-Shopify-Access-Token": storeConfig.adminToken,
                    "Content-Type": "application/json",
                },
            }
        );

        const products = response.data.data.products.edges;
        const result = [];

        for (const p of products) {
            const title = p.node.title;
            const variants = p.node.variants.edges
                .map(v => ({
                    title: v.node.title,
                    price: parseFloat(v.node.price),
                }))
                .sort((a, b) => a.price - b.price);

            for (const v of variants) {
                result.push(`${title} -  variant ${v.title} - price $${v.price}`);
            }
        }

        return result;
    } catch (err) {
        console.log("Error", err.response?.data || err.message);
        return [];
    }
}

const args = minimist(process.argv.slice(2));
const productName = args.name || "";

if (!productName) {
    console.log("No Product name specified");
    process.exit(1);
}

fetchProductsByName(productName)
    .then(results => {
        if (results.length > 0) {
        results.map(p=> console.log(p))
        } else {
            console.log("No matching products.");
        }
    })
