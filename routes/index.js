var express = require('express');
var router = express.Router();
var nodemailer = require("nodemailer");

const { SitemapStream, streamToPromise } = require('sitemap')
const { createGzip } = require('zlib')

//**************************************************
//Models
//**************************************************

var user = require("../modules/user");
var transaction = require("../modules/transaction");


//**************************************************
//Middelware
//**************************************************


//Check if user is Authenticated to enter a page 
function isLogged(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

//Check if user is authenticated and still trying to access login/registration page
function isAlreadyLogged(req, res, next) {
  if (req.isAuthenticated()) {
    res.redirect("/dashboard")
  }
  return next();
}


//**************************************************
//Routes
//**************************************************


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index');
});


//Direct to Dashboard of user
router.get('/dashboard', isLogged, function (req, res) {
  if (req.user.userType == "donor") {
    if (req.session.order && req.session.order == "Yes") {
      req.session.order = "No";
      res.render("donor/final", { Order: "Yes" });
    }
    else {
      res.render("donor/final", { Order: "No" });
    }
  }

  else if (req.user.userType == "consumer") {
    if (req.session.order && req.session.order == "Yes") {
      req.session.order = "No";
      res.render("consumer/final", { Order: "Yes" });
    }
    else {
      res.render("consumer/final", { Order: "No" });
    }
  }

  else if (req.user.userType == "nodal") {
    res.render("nodal/final");
  }
});

/* GET About page. */
router.get('/about', function (req, res, next) {
  res.render('extras/about');
});

/* GET Contact page. */
router.get('/contact', function (req, res, next) {
  res.render('extras/contact');
});

/* GET Covid19 page. */
router.get('/safe', function (req, res, next) {
  res.render('extras/safe');
});

/* GET team page. */
router.get('/team', function (req, res, next) {
  res.render('extras/team');
});

/* GET food page. */
router.get('/whatfood', function (req, res, next) {
  res.render('extras/whatfood');
});

/* GET T&C page. */
router.get('/terms', function (req, res, next) {
  res.render('extras/terms');
});

/* GET philosophy page. */
router.get('/philosophy', function (req, res, next) {
  res.render('extras/philosophy');
});

/* GET faq page. */
router.get('/faq', function (req, res, next) {
  res.render('extras/faq');
});


let sitemap;

router.get('/sitemap.xml', function (req, res) {
  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');
  if (sitemap) {
    res.send(sitemap)
    return
  }

  try {
    const smStream = new SitemapStream({ hostname: 'https://example.com/' })
    const pipeline = smStream.pipe(createGzip())

    // pipe your entries or directly write them.
    smStream.write({ url: 'https://anndata.co.in/', changefreq: 'daily', priority: 1.00 })
    smStream.write({ url: 'https://anndata.co.in/about', changefreq: 'weekly', priority: 0.80 })
    smStream.write({ url: 'https://anndata.co.in/philosophy', changefreq: 'weekly', priority: 0.80 })
    smStream.write({ url: 'https://anndata.co.in/covid19', changefreq: 'weekly', priority: 0.80 })
    smStream.write({ url: 'https://anndata.co.in/terms', changefreq: 'weekly', priority: 0.80 })
    smStream.write({ url: 'https://anndata.co.in/whatfood', changefreq: 'weekly', priority: 0.80 })
    smStream.write({ url: 'https://anndata.co.in/team', changefreq: 'weekly', priority: 0.80 })
    smStream.write({ url: 'https://anndata.co.in/contact', changefreq: 'weekly', priority: 0.80 })
    smStream.write({ url: 'https://anndata.co.in/login', changefreq: 'weekly', priority: 0.80 })
    smStream.write({ url: 'https://anndata.co.in/register', changefreq: 'weekly', priority: 0.80 })

    smStream.end()

    // cache the response
    streamToPromise(pipeline).then(sm => sitemap = sm)
    // stream write the response
    pipeline.pipe(res).on('error', (e) => { throw e })
  } catch (e) {
    console.error(e)
    res.status(500).end()
  }
});



module.exports = router;
