const capitalizeFirst = str => `${str[0].toUpperCase()}${str.substr(1)}`;

const makeInsert = codeArray => line => codeArray.push(line);

const makeIndent = insert => line => insert(`${'  '}${line}`);

const declaration = (type, name, value = undefined) => `${type} ${name}${value ? ` = ${value}` : ''};`;

const appendOrOr = (i, arr) => `${i < (arr.length - 1) ? ' ||' : ''}`;

const primitiveTypes = ['bool', 'int', 'uint', 'double', 'float', 'string', 'char', 'uchar'];

const getConverterFromType = (type) => {
  const pType = primitiveTypes.find(t => t === type);
  if (!!pType) {
    return `${capitalizeFirst(pType)}Converter`;
  }
  return `${type}::Converter`;
};

const makeInsertConstructor = insert => (workerName, self) => {
  const indent2 = makeIndent(insert);
  insert(`${self} self;`);
  insert(`${workerName}(${self} self) {`);
  indent2('this->self = self;');
  insert('}');
};

const makeInsertMembers = insert => (requiredParams, optionalParams, returnValues) => {
  const insertDeclaration = param => insert(declaration(param.type, param.name, param.defaultValue));

  const preventNameUndefined = ret => (ret.name ? ret : Object.assign({}, ret, { name: 'retVal' }));

  requiredParams.concat(optionalParams).forEach(insertDeclaration);
  insert('');
  returnValues.map(preventNameUndefined).forEach(insertDeclaration);
};

// TODO
const makeInsertExecute = insert => (funcName, allParameters) => {
  const indent2 = makeIndent(insert);
  insert('const char* execute() {');
  indent2(`cv::${funcName}(${allParameters.map(p => p.name).join(', ')});`);
  indent2('return "";');
  insert('}');
};

const makeInsertReturn = insert => (returnValues) => {
  const indent2 = makeIndent(insert);
  const wrapCall = rv => `${getConverterFromType(rv.type)}::wrap(${rv.name})`;

  insert('v8::Local<v8::Value> getReturnValue() {')
  if (returnValues.length === 1) {
    indent2(`return ${wrapCall(returnValues[0])};`)
  } else {
    indent2('v8::Local<v8::Object> ret = Nan::New<v8::Object>();');
    returnValues.forEach(rv => {
      indent2(`Nan::Set(ret, Nan::New("${rv.name}").ToLocalChecked(), ${wrapCall(rv)});`);
    });
    indent2('return ret;');
  }
  insert('}')
};

const makeInsertUnwrapArgs = insert => (params, startIdx = -1) => {
  const isOptional = startIdx > -1;
  const off = isOptional ? startIdx : 0;
  const indent2 = makeIndent(insert);
  const indent4 = makeIndent(indent2);

  insert(`bool unwrap${isOptional ? 'Optional' : 'Required'}Args(Nan::NAN_METHOD_ARGS_TYPE info) {`);
  indent2(`return (`);
  params.forEach((arg, i) => {
    indent4(`${getConverterFromType(arg.type)}::${isOptional ? 'optArg' : 'arg'}(${i + off}, &${arg.name}, info)${appendOrOr(i, params)}`);
  });
  indent2(');');
  insert('}');
};

const makeInsertUnwrapFromOpts = insert => (params, optArgIdx) => {
  const indent2 = makeIndent(insert);
  const indent4 = makeIndent(indent2);

  insert('bool hasOptArgsObject(Nan::NAN_METHOD_ARGS_TYPE info) {');
  indent2(`return FF_ARG_IS_OBJECT(${optArgIdx});`);
  insert('}');
  insert('');

  insert('bool unwrapOptionalArgsFromOpts(Nan::NAN_METHOD_ARGS_TYPE info) {');
  indent2(`v8::Local<v8::Object> opts = info[${optArgIdx}]->ToObject();`);
  indent2(`return (`);
  params.forEach((arg, i) => {
    indent4(`${getConverterFromType(arg.type)}::optProp(&${arg.name}, "${arg.name}", opts)${appendOrOr(i, params)}`);
  });
  indent2(');');
  insert('}');
};

module.exports = ({ namespace, self, isClassMethod = false }, signature) => {
  const {
    name: funcName,
    optionalParams,
    returnValues
  } = signature;

  const allParameters = signature.requiredParams.concat(optionalParams);
  const requiredParams = isClassMethod ? signature.requiredParams.slice(1) : signature.requiredParams;

  const generated = [];
  const insert = makeInsert(generated);
  const indent2 = makeIndent(insert);

  const insertConstructor = makeInsertConstructor(indent2);
  const insertMembers = makeInsertMembers(indent2);
  const insertExecute = makeInsertExecute(indent2);
  const insertReturn = makeInsertReturn(indent2);
  const insertUnwrapArgs = makeInsertUnwrapArgs(indent2);
  const insertUnwrapFromProps = makeInsertUnwrapFromOpts(indent2);

  const workerName = `${capitalizeFirst(funcName)}Worker`;

  insert(`struct ${namespace}::${workerName} : public SimpleWorker {`)
  insert('public:');
  insertConstructor(workerName, self);
  insert('');
  insertMembers(requiredParams, optionalParams, returnValues);
  insert('');
  insertExecute(funcName, allParameters);
  insert('');
  insertReturn(returnValues);
  if (!!requiredParams.length) {
    insert('');
    insertUnwrapArgs(requiredParams);
  }

  const optArgIdx = requiredParams.length;
  if (!!optionalParams.length) {
    insert('');
    insertUnwrapArgs(optionalParams, optArgIdx);
  }
  if (optionalParams.length > 1) {
    insert('');
    insertUnwrapFromProps(optionalParams, optArgIdx);
  }
  insert('};');
  return generated;
};