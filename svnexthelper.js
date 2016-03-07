var SVN = require("svn");

var svnroot = false;
var workdir = ".";
var remoteurl = "";

process.argv.forEach(function(val, index, array) {
  var kv = val.split("=");
  if (kv && kv[0] && (kv[0] == "--svnroot")) {
    svnroot = kv[1];
  } else if (kv && kv[0] && (kv[0] == "--workdir")) {
    workdir = kv[1];
  } else if (kv && kv[0] && (kv[0] == "--remote")) {
    remoteurl = kv[1];
  }
});

if (!svnroot) {
  console.log("Usage: node svnexthelper.js --svnroot=<svnroot> [--remote=<remoteurl>] [--workdir=<workdir>]");
  return;
}


var svnobj = new SVN(workdir, remoteurl);

var oldexternals = [];
var newexternals = [];

function saveLinesToFile(file, lines) {
  var fs = require("fs");
  var gluedtxt = lines.join("\r\n");
  fs.writeFile(file, gluedtxt, function(err){
    if (err) {
      console.log(err);
    }
  });
}

function allExternalsProcessed() {
  for (var i in oldexternals) {
    if (!newexternals[i]) {
      return false;
    }
  }

  return true;
}

var t1 = false;

// todo: add command line option to do this specifically

// code to fetch svn:externals, get their individual last revision id and write files to use with propset
//  so we can start locking revisions to a branch or tag
svnobj.externals.get({remote: remoteurl}, function(err, data) {
  if ( err ) {
    console.log(err);
    return;
  }

  var iLineId = oldexternals.length;
  oldexternals[iLineId] = data;

  var sep = data.split(" ");

  svnobj.info(remoteurl + " " + sep[0], function(error, result) {
    newexternals[iLineId] = "-r" + result['Last Changed Rev'] + " " + data;
  });

  if (!t1) {
    // todo: this bit can go wrong because of the timing of the async calls going on
    //   really need to use some kind of thread join() to sync
    t1 = setInterval(function() {
      if (allExternalsProcessed()) {
        // all externals are processed now
        saveLinesToFile("oldext.txt", oldexternals);
        saveLinesToFile("newext.txt", newexternals);

        clearInterval(t1);
        t1 = false;
      }
    }, 1000);
  }
});
