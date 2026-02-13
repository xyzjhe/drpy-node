import pako from '../libs_drpy/pako.min.js';
global.pako = pako;

import CryptoJS from '../libs_drpy/crypto-js.js';
global.CryptoJS = CryptoJS;

import randomUa from '../utils/random-http-ua.js';
global.randomUa = randomUa;

import * as jinjaMod from '../libs_drpy/jinja.js';
global.jinja = jinjaMod.render ? jinjaMod : (jinjaMod.default || jinjaMod);
