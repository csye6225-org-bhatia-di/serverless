var aws = require("aws-sdk");
var ses = new aws.SES({ region: "us-east-1" });
const aws_region = "us-east-1";
const dynamoDBObj = new aws.DynamoDB({apiVersion: '2012-08-10', region: aws_region});
const DynamoDBClient = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: aws_region });
const SentEmailTable = "SentEmailTable";

exports.handler = async (event, context, callback) => {
    console.log(JSON.stringify(event.Records[0].Sns));

    let username=event.Records[0].Sns.MessageAttributes.username.Value;
    let domainName=event.Records[0].Sns.MessageAttributes.domainName.Value;
    let token=event.Records[0].Sns.MessageAttributes.token.Value;
    let first_name=event.Records[0].Sns.MessageAttributes.first_name.Value;
    
    let searchSentEmailParams = {
        TableName: SentEmailTable,
        FilterExpression: 'username = :username',
        ExpressionAttributeValues: {
        ':username': username
      }
    };

    console.log("### Beinning check on dynamo db ###");
    var existingUsers = null;

    
        await DynamoDBClient.scan(searchSentEmailParams).promise().then(data => {

            existingUsers = data.Items.length == 0 ? null : data.Items[0];
        }).catch(error => {
            console.log("Fetch from Sent Email dynamo db failed - " + error.message);

        });
    
    if (existingUsers && existingUsers.hasOwnProperty("username") && existingUsers["username"] === username) {
            console.log("This is a duplicate SNS message");
     
    }

    else {

        await dynamoDBObj.putItem({
            Item: {
                 "existingEmailId": {'S' : createRandomString(15)},
                'username': {
                    'S': username
                }
            },
            TableName: SentEmailTable
        }).promise()
        .then(data => {
            console.log(data);
        }).catch(error => {
            console.log(error);
        });

        await sendEmailUsingSES(domainName, username, token, first_name);

        
    }  
};

const sendEmailUsingSES = async (domainName, username, token, first_name) => {

    let link = `http://${domainName}/v1/verifyUserEmail?email=${username}&token=${token}`;

    let body = "Hi "+ first_name +",\n\n"+
    "Hi you have registered on our application, hence you need to verify your email address before using your account by clicking on below link:" +"\n\n\n"+
    "Regards,"+"\n"+domainName+"\n\n\n"+
    link
    let from = "noreply@"+domainName
    let emailBody = {
        Destination: {
            ToAddresses: [username],
        },
        Message: {
            Body: {
                Text: { Data: body },
            },
            Subject: { Data: "User Account Verification Email" },
        },
        Source: from,
    };
    console.log("########### Sending email ##############");

    let sendEmailToUserForVerification = await ses.sendEmail(emailBody).promise()
        .then(function(result) {
            console.log(result);
        })
        .catch(function(err) {
            console.error(err, err.stack);
        });
    console.log("########### Sent email ##############");
    
};

function createRandomString(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}