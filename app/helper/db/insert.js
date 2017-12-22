const fetchInfo = require('./../fetch');

module.exports = {
  insert: function(db, name, res) {
    fetchInfo.fetchData(name, res)
      .then((finalData) => {
        // save to db
        finalData['_id'] = finalData['login'];

        db.collection('stats').insert(finalData, (err, result) => {
          if (err) {
            console.log('Insert failed. Error - ' + err.message); 
          } else {
            console.log('Inserted. ID: ' + result.ops[0]['_id']);
          }
        });

        return res.json(finalData);
      })
      .catch(error => {
        return res.json({'success': false, 'message': error.message});
      });
  },

  update: function(db, idDict, name, res) {
    fetchInfo.fetchData(name, res)
      .then((finalData) => {
        // update to db
        finalData['_id'] = finalData['login'];

        db.collection('stats').update(idDict, finalData, (err, result) => {
          if (err) {
            console.log('Update failed. Error - ' + err.message); 
          } else {
            console.log('Updated. ID: ' + finalData['_id']);
          }
        });

        return res.json(finalData);
      })
      .catch(error => {
        return res.json({'success': false, 'message': error.message});
      });
  }
};