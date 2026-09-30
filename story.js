"use strict";
/* STORY: the emoji, idioms, and scenes. To add an idiom, edit this file only.
   (game.js reads IDIOMS, NODES and IDIOM_IDS from here.) */

/* =====================================================================
   ICONS: plain emoji, looked up by name
   ===================================================================== */
const EMOJI = {
  /* faces */
  stars:"🤩", grin:"😁", smile:"😊", unsure:"😖", worried:"😟", dizzy:"😵", cry:"😭", mute:"😶", roll:"🙄",
  scared:"😱", grump:"😠", nervous:"😰", shrug:"🤷", away:"🙈",
  /* hands, arrows, marks */
  arrowR:"👉", arrowL:"👈", cross:"🙅", undo:"↩️", nope:"🚫", down:"📉",
  /* food */
  milk:"🥛", apple:"🍎", egg:"🍳", eggface:"🥚",
  /* weather */
  cloud:"☁️", storm:"⛈️", rain:"🌦️", tornado:"🌪️", ball:"🔮",
  /* fun */
  party:"🎉", ticket:"🎟️", dice:"🎲", trophy:"🏆", tennis:"🎾",
  /* reading */
  magnifier:"🕵️", letter:"💌", rocket:"🚀", books:"📚",
  /* dog + street */
  dog:"🐕", bone:"🦴", coin:"🪙", bag:"💰", tree:"🌳", rock:"🪨",
  /* home */
  bed:"🛏️", couch:"🛋️", zzz:"😴", think:"🤔", eyes:"👀", search:"🔎"
};

/* =====================================================================
   STORY DATA  (edit this block to change the game)

   IDIOMS   every idiom you can unlock
              icon / title           what the player sees when it's found
              def / first / origin   the reference text (first and origin are optional; leave them out when no source gives one)
              refs                   [name, url, role?] for every source used; role is only needed when a card has more than one
              hint                   scrapbook hint: which PART OF THE DAY, never the choice
              anim                   bounce | shake | fall
   NODES    every scene
              kind     "choice" (default) | "text" (asks for a name) | "numbers" | "end" (the score, and on a win a sleep idiom picked from your final mood)
              text     the prompt. {friend} and {dog} fill in the player's names
              t        how far through the day, 0 = afternoon start ... 5 = sundown (moves the sun)
              gate     if the score is 0 or less on arrival, jump to the lose screen
              choices  icon, label, next   (plus idiom, delta, say when the choice reveals an idiom)
   ===================================================================== */
/* Sources. Definitions and first-recorded dates come from the Merriam-Webster.com Dictionary.
   Where it has no entry, the card names the source it used instead. */
const mw   = slug => ["Merriam-Webster", "https://www.merriam-webster.com/dictionary/" + slug];
const wiki = slug => ["Wikipedia", "https://en.wikipedia.org/wiki/" + slug];
const HENDRICKSON = ["Hendrickson (1997, quoted)", "https://www.phrases.org.uk/bulletin_board/6/messages/909.html"];

const IDIOMS = {
  right:   {icon:"bed", title:"Wake up on the right side of the bed",
            def:"To wake up in a good mood.",
            origin:"The Romans, Augustus in particular, took care to rise on the right side of the bed, the side thought lucky.",
            refs:[[...HENDRICKSON, "Origin"]],
            hint:"Something from waking up", anim:"bounce"},
  wrong:   {icon:"grump", title:"Wrong side of the bed",
            def:"To be in a bad mood all day.",
            origin:"The \"wrong\" side is the left, following a superstition that dates to Roman times.",
            refs:[[...mw("get%20up%20on%20the%20wrong%20side%20of%20the%20bed"), "Definition"], [...HENDRICKSON, "Origin"]],
            hint:"Something from waking up", anim:"shake"},
  milk:    {icon:"milk", title:"Don't cry over spilled milk",
            def:"To worry about something that can't be changed.",
            origin:"An early form, \"No weeping for shed milk,\" appears in James Howell's 1659 collection of proverbs, the earliest citation in the Oxford English Dictionary.",
            refs:[["Oxford Learner's", "https://www.oxfordlearnersdictionaries.com/us/definition/english/spill_1", "Definition"], ["Grammarphobia", "https://grammarphobia.com/blog/2009/09/crying-over-spilled-milk.html", "Origin"]],
            hint:"Something at breakfast", anim:"fall"},
  apple:   {icon:"apple", title:"An apple a day keeps the doctor away",
            def:"Healthy eating keeps you well.",
            origin:"A variant, \"Eat an apple on going to bed, and you'll keep the doctor from earning his bread,\" was recorded as a Pembrokeshire saying in 1866. The modern wording appeared in print by 1887.",
            refs:[wiki("An_apple_a_day_keeps_the_doctor_away")],
            hint:"Something at breakfast", anim:"bounce"},
  egg:     {icon:"eggface", title:"Egg on your face",
            def:"A state of embarrassment or humiliation.",
            refs:[mw("egg%20on%20one%27s%20face")],
            hint:"Something at breakfast", anim:"fall"},
  weather: {icon:"storm", title:"Weather the storm",
            def:"To get through a hard time without much harm.",
            refs:[mw("weather%20the%20storm")],
            hint:"Something from the weather forecast", anim:"shake"},
  perfect: {icon:"tornado", title:"A perfect storm",
            def:"A disaster caused by several factors combining.",
            first:"1998",
            refs:[mw("perfect%20storm")],
            hint:"Something from the weather forecast", anim:"shake"},
  calm:    {icon:"nervous", title:"The calm before the storm",
            def:"A peaceful time just before major activity.",
            origin:"The word \"calm\" comes, probably ultimately, through Old Spanish and Late Latin from a Greek word for heat. Its first known use is in the 14th century.",
            refs:[["Vocabulary.com", "https://www.vocabulary.com/dictionary/the%20calm%20before%20the%20storm", "Definition"], [...mw("calm"), "Word history"]],
            hint:"Something from the weather forecast", anim:"shake"},
  cloud9:  {icon:"cloud", title:"On cloud nine",
            def:"A feeling of elation.",
            first:"1936",
            refs:[mw("cloud%20nine")],
            hint:"Something from the weather forecast", anim:"bounce"},
  shine:   {icon:"party", title:"Rain or shine",
            def:"No matter what happens.",
            refs:[mw("rain%20or%20shine")],
            hint:"Something from the weather forecast", anim:"bounce"},
  parade:  {icon:"nope", title:"Rain on their parade",
            def:"To spoil someone's pleasure.",
            refs:[mw("rain%20on%20someone%27s%20parade")],
            hint:"Something from the weather forecast", anim:"shake"},
  rain:    {icon:"ticket", title:"Take a rain check",
            def:"A promise that an offer will still be honored later.",
            first:"1884",
            refs:[mw("rain%20check")],
            hint:"Something from the weather forecast", anim:"bounce"},
  book:    {icon:"books", title:"Don't judge a book by its cover",
            def:"Don't judge by appearance alone.",
            origin:"An early reference appears in George Eliot's The Mill on the Floss (1860). The phrase was popularized by the 1946 mystery Murder in the Glass Room.",
            refs:[wiki("Don%27t_judge_a_book_by_its_cover")],
            hint:"Something from your reading time", anim:"bounce"},
  tree:    {icon:"tree", title:"Barking up the wrong tree",
            def:"To pursue a mistaken course.",
            first:"1826",
            refs:[mw("bark%20up%20the%20wrong%20tree")],
            hint:"Something with your dog", anim:"shake"},
  chew:    {icon:"bone", title:"Bite off more than you can chew",
            def:"To take on more than you can handle.",
            first:"1877",
            refs:[mw("bite%20off%20more%20than%20one%20can%20chew")],
            hint:"Something with your dog", anim:"shake"},
  dime:    {icon:"coin", title:"A dime a dozen",
            def:"So common as to have little value.",
            first:"1919",
            refs:[mw("a%20dime%20a%20dozen")],
            hint:"Something with your dog", anim:"bounce"},
  penny:   {icon:"bag", title:"A penny saved is a penny earned",
            def:"Saving money matters.",
            refs:[mw("a%20penny%20saved%20%28is%20a%20penny%20earned%29")],
            hint:"Something with your dog", anim:"bounce"},
  court:   {icon:"tennis", title:"The ball's in your court",
            def:"The next move is yours.",
            refs:[mw("the%20ball%20is%20in%20one%27s%20court")],
            hint:"Something with your dog", anim:"bounce"},
  rock:    {icon:"rock", title:"Hit rock bottom",
            def:"To reach the lowest point possible.",
            first:"1884 (adjective), 1890 (noun)",
            refs:[mw("rock-bottom")],
            hint:"Only found by having a very bad day", anim:"fall"},
  baby:    {icon:"zzz", title:"Sleep like a baby",
            def:"To sleep very well.",
            refs:[mw("sleep%20like%20a%20baby%2Flog")],
            hint:"Something at bedtime", anim:"bounce"},
  sleepon: {icon:"think", title:"Sleep on it",
            def:"To wait until morning to decide.",
            refs:[mw("sleep%20on%20it")],
            hint:"Something at bedtime", anim:"bounce"},
  wink:    {icon:"eyes", title:"Can't sleep a wink",
            def:"To not sleep at all.",
            refs:[mw("not%20sleep%20a%20wink")],
            hint:"Something at bedtime", anim:"shake"},
  stone:   {icon:"search", title:"Leave no stone unturned",
            def:"To make every possible effort to find something.",
            refs:[mw("leave%20no%20stone%20unturned")],
            hint:"Find every other idiom", anim:"bounce"}
};

const NODES = {
  start:{t:0,
    /* the only scene with logic: it greets returning players (see welcomeText) */
    text:() => welcomeText(),
    choices:[{icon:"dice",label:"Yes, let's play",next:"wake"},{icon:"cross",label:"Not today",next:"no"}]},
  no:{text:"No problem. The day will carry on without you.",
    choices:[{icon:"undo",label:"Actually, I'll play",next:"wake"}]},

  wake:{t:0,
    text:"You're having difficulty sleeping. Do you turn right or left?",
    choices:[
      {icon:"arrowR",label:"Turn right",idiom:"right",delta:10,say:"You wake up rested and in a good mood.",next:"breakfast"},
      {icon:"arrowL",label:"Turn left",idiom:"wrong",delta:-10,say:"You wake up irritable, and it lasts.",next:"breakfast"}]},

  breakfast:{t:1, gate:true,
    text:"You're hungry. What do you have for breakfast?",
    choices:[
      {icon:"milk",label:"Milk",next:"milk2"},
      {icon:"apple",label:"Apple",idiom:"apple",delta:10,say:"Great choice! You will stay in good health.",next:"weather"},
      {icon:"egg",label:"Eggs",idiom:"egg",delta:-10,say:"Somehow the egg ended up on your forehead.",next:"weather"}]},
  milk2:{
    text:"You drop your glass and feel a tear welling up. What do you do?",
    choices:[
      {icon:"cry",label:"Let it out",idiom:"milk",delta:-10,say:"You let the tear fall. It doesn't bring the milk back.",next:"weather"},
      {icon:"mute",label:"Suppress it",idiom:"milk",delta:0,say:"You hold it in and reach for a towel. You're safe.",next:"weather"}]},
  weather:{t:2, gate:true,
    text:"You turn on the weather channel. What does the forecast say?",
    choices:[
      {icon:"cloud",label:"Cloudy",next:"cloud"},
      {icon:"storm",label:"Stormy",next:"storm"},
      {icon:"rain",label:"Light rain",next:"rain1"}]},
  storm:{
    text:"The weather makes you remember a psychic you ran into.\nShe said something about a pathetic fallacy...\nHow did you respond?",
    choices:[
      {icon:"ball",label:"With interest",idiom:"weather",delta:10,say:"She wished you well. The day goes fine from there.",next:"reading"},
      {icon:"roll",label:"With sarcasm",idiom:"perfect",delta:-50,say:"She cursed you! You have a terrible day and can only sigh.",next:"reading"},
      {icon:"scared",label:"With fear",idiom:"calm",delta:0,say:"You're still nervous about her. You can't help but feel something worse is coming.",next:"reading"}]},
  cloud:{kind:"numbers", answer:9, text:"Pick a number from 1 to 10.",
    win:{icon:"cloud",label:"Nine",idiom:"cloud9",delta:20,say:"You're happier than you've been all week.",next:"reading"}},
  rain1:{kind:"text", key:"friend", def:"Sam", placeholder:"Sam", next:"rain2",
    text:"Hey, I forgot: what's your best friend's name again?"},
  rain2:{
    text:"{friend} invites you to their birthday party. Do you accept the invite?",
    choices:[
      {icon:"party",label:"Yes",idiom:"shine",delta:10,say:"You told them you'd be there no matter what. They were thrilled.",next:"reading"},
      {icon:"nope",label:"No",idiom:"parade",delta:-20,say:"You said no, and they unfriended you.",next:"reading"},
      {icon:"shrug",label:"Maybe",idiom:"rain",delta:0,say:"You said maybe. They were upset, but understood your reasoning.",next:"reading"}]},

  reading:{t:3, gate:true,
    text:"The weather clears up, so you decide to enrich your mind. What do you read?",
    choices:[
      {icon:"magnifier",label:"Mystery",idiom:"book",delta:0,say:"The cover was plain, but the story was great. I love mystery books!",next:"dogname"},
      {icon:"letter",label:"Romance",idiom:"book",delta:0,say:"The cover was plain, but the story was great. I love romance books!",next:"dogname"},
      {icon:"rocket",label:"Sci-fi",idiom:"book",delta:0,say:"The cover was plain, but the story was great. I love sci-fi books!",next:"dogname"}]},
  dogname:{t:4, kind:"text", key:"dog", def:"Biscuit", placeholder:"Biscuit", next:"dog",
    text:"It's time for an evening walk! You decide to bring your dog.\nHey, I forgot: what's your dog's name again?"},
  dog:{
    text:"{dog} is bored. What do you do?",
    choices:[
      {icon:"dog",label:"Let {dog} lead",idiom:"tree",delta:-20,say:"Oh no! {dog} could not stop running off the sidewalk. Fellow dogwalkers are mad.",next:"coin"},
      {icon:"bone",label:"Give a bone",idiom:"chew",delta:-20,say:"Oh no! {dog} tried to eat the whole bone in one go! I hope {dog} is okay!",next:"end"},
      {icon:"tennis",label:"Play fetch",next:"fetch"}]},
  coin:{
    text:"You see a coin on the street. What do you do?",
    choices:[
      {icon:"away",label:"Ignore it",idiom:"dime",delta:10,say:"Coins are everywhere anyway! You'd rather have the good karma.",next:"end"},
      {icon:"coin",label:"Pick it up",idiom:"penny",delta:10,say:"You pocket it. Every little bit counts.",next:"end"}]},
  fetch:{
    text:"{dog} caught the ball and is watching you, tail wagging. Do you want to win or lose points?",
    choices:[
      {icon:"trophy",label:"Win points",idiom:"court",delta:10,say:"It was your move, and you played it well.",next:"end"},
      {icon:"down",label:"Lose points",idiom:"court",delta:-10,say:"It was your move, and you dropped it on purpose. Bold.",next:"end"}]},

  end:{t:5, gate:true, kind:"end"},
  lose:{kind:"end", lose:true}
};
const IDIOM_IDS = Object.keys(IDIOMS);
