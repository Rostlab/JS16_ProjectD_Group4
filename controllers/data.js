// To consider:
// - caching

/* Generate CSV data for character. Format:
date,pos,neg
2016-03-07,1337,42
*/
module.exports = function(req, res) {
    res.type('text/plain');
    //res.type('text/csv');
    res.write('date,pos,neg\n');

    // for now just one month
    for (var i = 1; i <= 31; i++) {
        var pos = (Math.sin(i/10)+1)*1337;
        var neg = (Math.cos(i/10)+1)*1337;
        res.write("2016-03-" + (i < 10 ? "0"+i : ""+i) + "," +
            Math.round(pos) + "," +
            Math.round(neg) + "\n"
        );
    };

    res.end()
};
