// import * as localtDsCore from './localtDsCore.js';
import * as localtDsCore from './libs/localtDsCore.bundled.js';

console.log(getEngine)
// const a = await getEngine('爱推图[画]', {}, {proxyUrl: "xx"})
// console.log(a)
// const b = await getEngine('奇奇[官]', {do: 'cat'})
// console.log(b)
const c = await getEngine('果果[官]', {do: 'cat', ac: 'list', t: '3'})
console.log(c)