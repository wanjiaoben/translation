import {renderNewsCards} from './render-news-cards.mjs';import path from 'node:path';renderNewsCards(path.resolve(new URL('..',import.meta.url).pathname),"translation");
