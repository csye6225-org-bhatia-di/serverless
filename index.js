exports.handler = async (event) => {
    
    console.log(JSON.stringify(event.Records[0].Sns));

};
