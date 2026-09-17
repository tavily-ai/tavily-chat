import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalUrl, diverseSources, publisher} from '../server/source-quality.mjs';
test('source selection deduplicates tracking and fragments while preserving product identifiers',()=>{
 const items=[{url:'https://example.com/report?utm_source=x#one',content:'Evidence',score:.9},{url:'https://example.com/report#two',content:'Evidence',score:.8},{url:'https://other.org/study',content:'Independent study',score:.7}];
 const selected=diverseSources(items);
 assert.equal(selected.length,2);assert.equal(selected[0].url,'https://example.com/report');
 assert.equal(canonicalUrl('https://shop.com/item?id=123&utm_medium=ad'),'https://shop.com/item?id=123');
 assert.equal(canonicalUrl('javascript:alert(1)'),null);
});
test('publisher diversity limits repeated subdomains and retains relevance within each publisher',()=>{
 const items=Array.from({length:5},(_,i)=>({url:'https://docs.example.com/page'+i,content:'Relevant evidence',score:1-i/10}));
 items.push({url:'https://news.example.com/story',content:'Same publisher',score:.8},{url:'https://independent.org/report',content:'Independent evidence',score:.7},{url:'https://empty.com',content:''});
 const selected=diverseSources(items);
 assert.equal(selected.length,3);assert.equal(selected[1].url,'https://independent.org/report');
 assert.equal(selected[0].url,'https://docs.example.com/page0');
 assert.equal(publisher('https://shop.brand.co.uk/product'),'brand.co.uk');
});

test('primary evidence is retained ahead of higher-scoring secondary pages',()=>{
 const selected=diverseSources([{url:'https://secondary.com/post',content:'Commentary',score:1},{url:'https://original.edu/study',content:'Original study',score:.5,primary:true}],{limit:1});
 assert.equal(selected[0].url,'https://original.edu/study');
});
