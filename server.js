const express  = require('express');
var cors = require('cors')
const app      = express();
const port     = process.env.PORT || 4201;
const server   = require('http').Server(app);


const axios = require('axios');
const csvtojson = require('csvtojson');

axios.defaults.headers['Content-Type'] = 'text/plain; charset=ISO-8859-3';
var URL_CASE = 'http://www.cnes-geipan.fr/fileadmin/documents/cas_pub.csv';
var URL_TEMIGNAGE = 'http://www.cnes-geipan.fr/fileadmin/documents/temoignages_pub.csv';
var CronJob = require('cron').CronJob;

const mongoDBModule = require('./app_modules/cases');

// Pour les formulaires standards
const bodyParser = require('body-parser');

// Lance le serveur avec express
server.listen(port);


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

console.log('Welcome to ' + "\x1b[36m" +   'Geipan' + "\x1b[37m" + ' Rest: ');
console.log(new Date());
console.log("Serveur lancé : " + "\x1b[33m http://localhost:" + port +  "\x1b[37m");

var job = new CronJob('0 */1 * * * *',async function() {
	// 'Every 30 minutes between 9-17:'
	let data_temionage = (await axios.get(URL_TEMIGNAGE,{charset:'ISO-8859-3'})).data;
	let data_cases = (await axios.get(URL_CASE,{charset:'ISO-8859-3'})).data;
	let cases = await csvtojson({delimiter: [';']}).fromString(data_cases);
	let temionages = await csvtojson({delimiter: [';']}).fromString(data_temionage);

	let output = temionages.reduce((a, c) => (a[c.id_cas] = (a[c.id_cas] || []).concat(c), a), {});
	cases.map(_case => {
		_case['temionages'] = output[_case.id_cas];
		return _case;
	});

	mongoDBModule.connexionMongo(function(err, client) {
		let reponse;
		let db = client.db("geipan");

		if(err) {
			console.log("erreur connexion");
			reponse = "\x1b[31m\" ER: \"\x1b[35m\" la connexion ne s'établit pas , EX : \x1b[31m  " + err + "\"\x1b[37m";
		} else {
			reponse = " - La connexion a été \x1b[32m établie \x1b[37m"
		}
		console.log(reponse);
		console.log('\n\n\n--> Update Database Cases: ' + "\x1b[37m")
		console.log(new Date());

		db.collection('cases').drop(function(err, delOK) {
			if (delOK) {
				console.log("\x1b[31m",'Collection deleted' + "\x1b[37m");
			}
		});

		db.collection('cases').insertMany(cases, function(err, res) {
			if (err) {
				throw err;
			}
			console.log("\x1b[32m","All Cases inserted" + "\x1b[37m");
		});

	});
});
job.start();

//------------------
// ROUTES
//------------------
// Utile pour indiquer la home page, dans le cas
// ou il ne s'agit pas de public/index.html
app.get('/', async function(req, res) {
	res.send("Welcome to geipan api <br>");
});


// On va récupérer des restaurants par un GET (standard REST) 
// cette fonction d'API peut accepter des paramètres
// pagesize = nombre de restaurants par page
// page = no de la page
// Oui, on va faire de la pagination, pour afficher
// par exemple les restaurants 10 par 10
app.post('/api/cases',  function(req, res) {
	// Si présent on prend la valeur du param, sinon 1
    let page = parseInt(req.query.page || 1);
    // idem si present on prend la valeur, sinon 10
    let pagesize = parseInt(req.query.pagesize || 10);
    let filter  = req.body;
	console.log(filter);
 	mongoDBModule.findCases(page, pagesize,filter, function(data,total) {
 		var objdData = {
 			msg:"cases recherchés avec succès",
 			data: data,
			length: total
 		}
 		res.send(JSON.stringify(objdData)); 
 	}); 
});


