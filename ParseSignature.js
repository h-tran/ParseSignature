
function removeAddressOperator(s){
	if(s[0] === '&')
		return s.substring(1);
	else
		return s;
}

function isIdentifier(s){
	return ['const'].includes(s);
}

function isReturnValueType(typeString){
	return ['OutputArray', 'CV_OUT', 'OutputArrayOfArrays'].includes(typeString); 
}

function extractParenthesisContent(inputString){
	const openingParenthesisIndex = inputString.indexOf('(');
	const closingParenthesisIndex = inputString.lastIndexOf(')');
	return inputString.substring(openingParenthesisIndex+1,closingParenthesisIndex);
}

function indexOfNextChar(inputString,searchPos,separationChar){
	let bracketCounterA = 0;	//()
	let bracketCounterB = 0;	//{}
	let bracketCounterC = 0;	//[]
	let bracketCounterD = 0;	//<>
	if(searchPos>=inputString.length)
		return -1;

	for(let i = searchPos; i < inputString.length; i++){
		switch(inputString[i]){
			case '(':
				 bracketCounterA++;
				 break;
			case ')':
				 bracketCounterA--;
				 break;
			case '{':
				 bracketCounterB++;
				 break;
			case '}':
				 bracketCounterB--;
				 break;
			case '[':
				 bracketCounterC++;
				 break;
			case ']':
				 bracketCounterC--;
				 break;
			case '{':
				 bracketCounterD++;
				 break;
			case '}':
				 bracketCounterD--;
				 break;
			case separationChar:
				if(bracketCounterA===0 && bracketCounterB===0 && bracketCounterC===0 && bracketCounterD===0)
					return i;				
				break;
			default:
				break;
			}
	}
	return -1;
}

function allOccurrencesIndexes(inputString,separationChar){
	let indexes = [];
	let currentIndex = 0;
	while(currentIndex > -1){
		let foundIndex=indexOfNextChar(inputString,currentIndex,separationChar);
		currentIndex=foundIndex;
		if(foundIndex > -1){
			indexes.push(foundIndex);
			currentIndex++;
		}
	}
	return indexes;

}

function allStringElements(inputString,separationChar=','){
	let allStringList = [];
	let startIndex = 0;
	let endIndex;
	let indexList = allOccurrencesIndexes(inputString,separationChar);
	indexList.unshift(0);
	indexList.push(inputString.length);

	for(let i = 0; i < indexList.length-1; i++){
		if(i > 0)
			startIndex = indexList[i]+1;

		endIndex = indexList[i+1];
	
		allStringList.push(inputString.substring(startIndex,endIndex));
	}
	return allStringList;
}

function determineNameAndType(inputString){
	const openingParenthesisIndex = inputString.indexOf('(');

	return inputString.substring(0,openingParenthesisIndex).split(' ').map((inputString => inputString.trim()))
}

function determineParameterStrings(inputString){

	return 	allStringElements(extractParenthesisContent(inputString))
			.map((inputString => inputString.trim()))
			.map((inputString) => {return allStringElements(inputString,' ')})	
}

function buildSingleJSON(inputArray){
	let obj;
	if(inputArray.length===2){
		const t = inputArray[0];
		const n = removeAddressOperator(inputArray[1]);
		obj = {
			type: t,
			name: n
		}
	}
	else if(inputArray.length===4){
		const t = inputArray[0];
		const n = removeAddressOperator(inputArray[1]);
		const d = inputArray[3];
		obj = {
			type: t,
			name: n,
			defaultValue: d
		}
	}
	else if(inputArray.length===3){
		if(isIdentifier(inputArray[0])){
			const t = inputArray[1];
			const n = removeAddressOperator(inputArray[2]);
			obj = {
				type: t,
				name: n				
			}
		}
	}
	else if(inputArray.length===5){
		if(isIdentifier(inputArray[0])){
			const t = inputArray[1];
			const n = removeAddressOperator(inputArray[2]);
			const d = inputArray[4];
			obj = {
				type: t,
				name: n,
				defaultValue: d
			}
		}		
	}
	return obj;
}

function buildWholeJSON(inputString){
	let nameAndType = determineNameAndType(inputString);
	const n = nameAndType.pop();
	let obj = {
		name: n,
		returnValues: [],
		requiredParams: [],
		optionalParams: []
	}
	let t = nameAndType.pop();
	if(t !== 'void')
		obj.returnValues.push({type: t, name: 'returnValue'});

	let parameters = determineParameterStrings(inputString).map((elem) => buildSingleJSON(elem));

	let returnValuesArray = parameters.filter((elem) => isReturnValueType(elem.type));

	returnValuesArray.forEach((elem) => {
		obj.returnValues.push(elem);
	});

	let optionalParamsArray = parameters.filter((elem) => !isReturnValueType(elem.type) && Object.keys(elem).length === 3);

	optionalParamsArray.forEach((elem) => {
		obj.optionalParams.push(elem);
	});

	let requiredParamsArray = parameters.filter((elem) => !isReturnValueType(elem.type) && Object.keys(elem).length === 2);

	requiredParamsArray.forEach((elem) => {
		obj.requiredParams.push(elem);
	});

	return obj;
}

module.exports = (input) => buildWholeJSON(input);