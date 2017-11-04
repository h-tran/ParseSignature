const fs = require('fs');
const parseSignature = require('./parseSignature');
const generateWorker = require('./generateWorker');


const signature = `
CV_WRAP void train(InputArrayOfArrays src, InputArray labels)
`


const signatureJSON = parseSignature(signature);
const gen = generateWorker(
  {
    namespace: 'BasicFaceRecognizer',
    self: 'cv::Ptr<cv::face::BasicFaceRecognizer>',
    isClassMethod: true
  },
  signatureJSON
);

console.log(gen);

const file = `generated/${signatureJSON.name}.cc`;
console.log(file);
fs.writeFileSync(file, gen.join('\r\n'))

