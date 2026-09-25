import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import autoprefixer from 'autoprefixer';
import wewebCssLayerPlugin from './weweb-postcss-layer-plugin.cjs';
import path from 'path';
import fs from 'fs';
import { parseEnv } from 'node:util';
import handlebars from 'handlebars';
import { createSsrPageComponentLoadersPlugin } from './vitePlugins/ssrPageComponentLoaders.ts';

const pages = {"b3ea209a-b36e-44ba-b7e0-00684ed10adf-en":{"outputDir":"./","lang":"en","title":"BigFlo & Olives","cacheVersion":"6","meta":[{"name":"title","content":"BigFlo & Olives"},{"name":"description","content":"Entretien du patrimoine arboricole & oléiculture à Beaumes de Venise"},{"name":"image","content":"/images/Logo_BFO_texte_gris_blanc_fond_sable@4x.png?_wwcv=6"},{"itemprop":"name","content":"BigFlo & Olives"},{"itemprop":"description","content":"Entretien du patrimoine arboricole & oléiculture à Beaumes de Venise"},{"itemprop":"image","content":"/images/Logo_BFO_texte_gris_blanc_fond_sable@4x.png?_wwcv=6"},{"name":"twitter:card","content":"summary"},{"name":"twitter:title","content":"BigFlo & Olives"},{"name":"twitter:description","content":"Entretien du patrimoine arboricole & oléiculture à Beaumes de Venise"},{"name":"twitter:image","content":"/images/Logo_BFO_texte_gris_blanc_fond_sable@4x.png?_wwcv=6"},{"property":"og:title","content":"BigFlo & Olives"},{"property":"og:description","content":"Entretien du patrimoine arboricole & oléiculture à Beaumes de Venise"},{"property":"og:image","content":"/images/Logo_BFO_texte_gris_blanc_fond_sable@4x.png?_wwcv=6"},{"property":"og:site_name","content":"BigFlo & Olives"},{"property":"og:type","content":"website"},{"name":"robots","content":"index, follow"}],"scripts":{"head":"\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://1cb48b89-5ccd-4126-8734-d9547fbbdd56.weweb-preview.io/"},{"rel":"alternate","hreflang":"en","href":"https://1cb48b89-5ccd-4126-8734-d9547fbbdd56.weweb-preview.io/"}]}};

function generatePageHtmlFiles() {
    const template = fs.readFileSync(path.resolve(__dirname, 'template.html'), 'utf-8');
    const compiledTemplate = handlebars.compile(template);

    for (const pageConfig of Object.values(pages)) {
        const html = compiledTemplate({
            title: pageConfig.title,
            lang: pageConfig.lang,
            meta: pageConfig.meta,
            structuredData: pageConfig.structuredData || null,
            scripts: {
                head: pageConfig.scripts.head,
                body: pageConfig.scripts.body,
            },
            alternateLinks: pageConfig.alternateLinks,
            cacheVersion: pageConfig.cacheVersion,
            baseTag: pageConfig.baseTag,
            encodedAssetBase: encodeURIComponent("/"),
        });

        if (!fs.existsSync(pageConfig.outputDir)) {
            fs.mkdirSync(pageConfig.outputDir, { recursive: true });
        }
        fs.writeFileSync(`${pageConfig.outputDir}/index.html`, html);
    }
}

const clientInputs = {};
for (const pageName in pages) {
    clientInputs[pageName] = path.resolve(__dirname, pages[pageName].outputDir, 'index.html');
}

function getFrontEnvironmentValues(root, mode) {
    const filePath = path.resolve(root, `.env.${mode}`);
    if (!fs.existsSync(filePath)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(parseEnv(fs.readFileSync(filePath, 'utf8'))).filter(([key]) => !key.startsWith('VITE_'))
    );
}

const onwarn = (entry, next) => {
    if (entry.loc?.file && /js$/.test(entry.loc.file) && /Use of eval in/.test(entry.message)) return;
    if (/Use of direct `eval`/.test(entry.message)) return;
    return next(entry);
};

export default defineConfig(({ mode, isSsrBuild }) => {
    if (!isSsrBuild) {
        generatePageHtmlFiles();
    }

    const build = {
        chunkSizeWarningLimit: 10000,
        ...(!isSsrBuild ? { manifest: '.ww-client-manifest.json' } : {}),
        rolldownOptions: {
            ...(!isSsrBuild ? { input: clientInputs } : {}),
            onwarn,
        },
    };

    if (isSsrBuild) {
        build.outDir = 'dist-ssr';
    }

    return {
        plugins: [createSsrPageComponentLoadersPlugin(), vue()],
        base: "/",
        define: {
            global: 'globalThis',
            __VUE_PROD_DEVTOOLS__: mode === 'development',
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__:
                mode === 'development' || !!process.env.WW_BACK_URL?.includes('weweb-preprod.io'),
            __WW_FRONT_ENV_VARIABLES__: JSON.stringify({
                staging: getFrontEnvironmentValues(__dirname, 'staging'),
                production: getFrontEnvironmentValues(__dirname, 'production'),
            }),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        css: {
            preprocessorOptions: {
                scss: {
                    api: 'modern-compiler',
                },
            },
            postcss: {
                plugins: [wewebCssLayerPlugin({ include: [/[/\\]src[/\\]extensions[/\\]/, /[/\\]node_modules[/\\]/] }), autoprefixer],
            },
        },
        ssr: {
            noExternal: true,
        },
        server: {
            port: 8080,
        },
        build,
    };
});
