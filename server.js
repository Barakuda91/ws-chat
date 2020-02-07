const express = require('express');
const app = express();
const errorHandler = new (require(`${ROOT_DIR}/Classes/ErrorHandler`))({name: 'APP_server'});

app.use('/', express.static(__dirname + '/public'));

app.listen(4000, () => {
    console.log(`App listening on port 4000!`);
}).catch(errorHandler.throwError);
