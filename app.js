let express = require('express');
let app = express();
let serv = require('http').Server(app);
let io = require('socket.io')(serv, {});
let val = require("./val.js");
let mapdata = require("./mapdata.js");
app.get('/', function(req, res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
serv.listen(process.env.PORT || 2000);
console.log("Server started");

SOCKET_LIST = {}
GAME_LIST = {};
let GAME_COUNT = 0;
//socket connection
io.sockets.on('connection', function(socket){
    //TODO: support multiple game instances
    if(GAME_COUNT == 0){
        GAME_LIST[GAME_COUNT] = new Game(GAME_COUNT);
        GAME_COUNT += 1;
        console.log("Gamee instance created")
        GAME_LIST[GAME_COUNT-1].addSocket(socket);
    }else{
        GAME_LIST[GAME_COUNT-1].addSocket(socket);
    }
    SOCKET_LIST[socket.id] = socket;
    console.log(socket.id + " connected");
    //console.log(self.map.OBJECT_TILE_ARRAY["2400"]);
    //listens to dissconnect
});

let deleteGame = function(id){
    delete GAME_LIST[id];
    GAME_COUNT -=1;
    console.log("Gamee instance deleted")
}

//game objects
let Entity = function(){
    let self = {};
    self.x = 0;
    self.y = 0;
    self.width = 0;
    self.height = 0;
    self.spdX = 0;
    self.spdY = 0;
    self.spd = 0;
    self.img = null;
    self.tileX = 0;
    self.tileY = 0;
    self.hp = 0;
    self.size = 30;
    self.isAlive = true;
    self.getNeighborTiles = function(map){
        //- returns the 8 neighboring tiles around this entity
        let res = [];
        res.push(map.getTile(self.tileX-1, self.tileY-1));
        res.push(map.getTile(self.tileX, self.tileY-1));
        res.push(map.getTile(self.tileX+1, self.tileY-1));
        res.push(map.getTile(self.tileX-1, self.tileY));
        //res.push(map.getTile(self.tileX, self.tileY));
        res.push(map.getTile(self.tileX+1, self.tileY));
        res.push(map.getTile(self.tileX-1, self.tileY+1));
        res.push(map.getTile(self.tileX, self.tileY+1));
        res.push(map.getTile(self.tileX+1, self.tileY+1));
        return res;
    }
    self.getDistance = function(pt){
        //- returns the Euclidean distance between this entity and pt
        return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2)); 
    }
    self.getDistanceSquared = function(pt){
        //- returns the Euclidean distance squared between this entity and pt
        //- this method is faster than getDistance and thus recommended
        return (a=self.x-pt.x)*a + (b=self.y-pt.y)*b;
    }
    self.decreaseHp = function(damage){
        if(self.hp-damage <= 0){
            self.isAlive = false;
            self.hp = 0;
        }else{
            self.hp -= damage;
        }
    }
    return self;
}
let Creature = function(){
    let self = new Entity();
    self.adjustSpd4CollisionWithSquare = function(neighbor){
        //- changes the spd to make it look as if the player collided with a plain surface
        let allowedOverlap = 5;
        let itile = neighbor;
        let iL = itile.x*val.tile_size; // left edge x of itile
        let iR = iL + val.tile_size;    // right edge x of itile
        let iT = itile.y*val.tile_size; // top edge y of itile
        let iB = iT + val.tile_size;    //  bottom edge y of itile
        let ps = (self.size - allowedOverlap)/2;
        let eX = self.x + self.spdX; // expected position x
        let eY = self.y;
        
        if(eX+ps > iL && eX-ps < iR && eY+ps > iT && eY-ps < iB){
            self.spdX = 0;
            self.collided = true;
        }
        eX = self.x; // expected position x
        eY = self.y + self.spdY;
        if(eX+ps > iL && eX-ps < iR && eY+ps > iT && eY-ps < iB){
            self.spdY = 0;
            self.collided = true;
        }
    }
    self.adjustSpd4CollisionWithQuarterCircle = function(neighbor){
        //- sets the spd = 0
        //- changes the position to make it look as if the player collided with a rounded surface
        //only works from the rounded side
        let itile = neighbor;
        let allowedOverlap = 0;
        let eX = self.x + self.spdX; // expected position x
        let eY = self.y + self.spdY;
        let ps = (self.size-allowedOverlap)/2;
        let radiiSum = ps+(val.tile_size-allowedOverlap);
        let dst = null;
        let centerX = null;
        let centerY = null;
        if(neighbor.shape==1){
            centerX = itile.x*val.tile_size;
            centerY = (itile.y+1)*val.tile_size;
        }else if(neighbor.shape==2){
            centerX = (itile.x+1)*val.tile_size;
            centerY = (itile.y+1)*val.tile_size;
        }else if(neighbor.shape==3){
            centerX = (itile.x+1)*val.tile_size;
            centerY = (itile.y)*val.tile_size;
        }else if(neighbor.shape==4){
            centerX = (itile.x)*val.tile_size;
            centerY = (itile.y)*val.tile_size;
        }else{
            console.log("Error: This tile has no shape");
        }
        let dstX = eX-centerX;
        let dstY = eY-centerY;
        dst = dstX*dstX + dstY*dstY;
        if(radiiSum*radiiSum > dst){
            self.x = centerX+(radiiSum)*(dstX/Math.sqrt(dst));
            self.y = centerY+(radiiSum)*(dstY/Math.sqrt(dst));
            self.spdX = 0;
            self.spdY = 0;
        }
    }

    self.adjustSpd4Collision = function(map){
        //- get neigbor tiles and check if each of them is passsable
        //- call apropriate adjustSpd ... Square or QuarterCircle

        let neighbors = self.getNeighborTiles(map);

        for(let i = 0; i < neighbors.length; i++){
            if(neighbors[i] === null){
                continue;
            }else if(neighbors[i].passable){
                continue;
            }else{
                if(neighbors[i].shape == 0 || neighbors[i].shape === null){
                    self.adjustSpd4CollisionWithSquare(neighbors[i]);
                }else{
                    self.adjustSpd4CollisionWithQuarterCircle(neighbors[i]);
                }
            }
        }
    }
    return self;
}
let Bot = function(game, team, path, type, id){
    let self = new Creature();
    self.id = id;
    self.hp = val.default_bot_hp;
    self.tileX = Math.floor(self.x/val.tile_size);
    self.tileY = Math.floor(self.y/val.tile_size);
    self.team = team;
    self.path = path;
    self.spd = val.default_bot_speed;
    self.x = (self.path[0][0]-0.5)*val.tile_size;
    self.y = (self.path[0][1]-0.5)*val.tile_size;
    self.path.shift();
    self.dstTileX = self.path[0][0];
    self.dstTileY = self.path[0][1];
    self.path.shift();
    self.spdAngle = 0;
    self.engagemetDst = val.bot_engage_dst+type*val.dst_bet_bot;
    self.size = val.bot_size;
    self.type = type;
    self.target = null;
    self.game = game;
    self.attackCount = 0;
    self.attackRate = val.bot_attack_rate;
    self.setSpd4TileDst = function(){
        self.spdAngle = Math.atan2(self.y-(self.dstTileY-0.5)*val.tile_size, self.x-(self.dstTileX-0.5)*val.tile_size);
        self.spdX = -Math.cos(self.spdAngle)*self.spd;
        self.spdY = -Math.sin(self.spdAngle)*self.spd;
    }
    self.setSpd4TargetDst = function(){
        let r = val.bot_attack_range+self.type*val.dst_bet_bot;
        let a = self.x - self.target.x;
        let b = self.y - self.target.y;
        if(a*a+b*b>r*r){
            self.spdAngle = Math.atan2(self.y-self.target.y, self.x-self.target.x);
            self.spdX = -Math.cos(self.spdAngle)*self.spd;
            self.spdY = -Math.sin(self.spdAngle)*self.spd;
        }else{
            let tangle = Math.atan2(self.target.y-self.y, self.target.x-self.x)/Math.PI*180;
            if(self.attackCount >= self.attackRate){
                self.attack(tangle);
                self.attackCount = 0;
            }else{
                self.attackCount += 1;
            }
            self.spdX = 0;
            self.spdY = 0;
            self.target = null;
        }
    }
    self.updateDst = function(){
        let r = 30;
        let a = self.x-(self.dstTileX-0.5)*val.tile_size;
        let b = self.y-(self.dstTileY-0.5)*val.tile_size;
        //if((a=(self.x-(self.dstTileX-0.5)*val.tile_size))*a+(b=((self.y-self.dstTileY-0.5)*val.tile_size))*b <(r*r)){
        if(self.path.length>0){
            if(a*a+b*b<r*r){
                self.dstTileX = self.path[0][0];
                self.dstTileY = self.path[0][1];
                self.path.shift();
            }
        }
    }
    self.attack = function(angle){
        new Bullet(self.game, self, angle, 2)
        //console.log("attack")
    }
    self.update = function(map){
        if(self.hp<=0){
            self.toRemove = true;
            return
        }
        //reassign spdX and Y because they might be set 0 for collision handling
        self.updateDst();
        //console.log(self.target);
        if(self.target === null){
            self.setSpd4TileDst();
        }else{
            self.setSpd4TargetDst();
        }
        self.adjustSpd4Collision(map);
        self.x += self.spdX;
        self.y += self.spdY;

        self.tileX = Math.floor(self.x/val.tile_size);
        self.tileY = Math.floor(self.y/val.tile_size);
    }
    return self;
}
let Bullet = function(game, owner, angle, accuracy){
    let self = new Entity();
    //angle of the velocity of this bullet
    angle = angle - accuracy + Math.random()*accuracy*2;
    self.spd = val.default_bullet_speed;
    //player object who generated this object
    self.owner = owner;
    self.team = owner.team;
    self.spdX = Math.cos(angle/180*Math.PI) * self.spd;
    self.spdY = Math.sin(angle/180*Math.PI) * self.spd;
    //the damage given to the colliding player
    self.damage = 1;
    //position of this bullet. The initial position is the position of the owner
    self.x = owner.x;
    self.y = owner.y;
    //whether this bullet should disappear
    self.toRemove = false;
    //the position of the player when this bullet was shot
    self.origin = {};
    self.origin.x = owner.x;
    self.origin.y = owner.y;
    //the age of this bullet
    self.timer = 0;
    //the age at which this bullet should be removed
    self.lifetime = 7;
    self.isCollidedWithPlayer = function(player){
        if(player.getDistanceSquared(self)<(a=player.size/2+val.bullet_size)*a){
            return true;
        }
        return false;
    }
    self.isCollidedWithBot = function(bot){
        if(self.getDistanceSquared(bot)<(a=bot.size/2+val.bullet_size)*a){
            return true;
        }
        return false;
    }
    self.update = function(game){
        //- check the lifetime to set toRemove
        //- check the collision with players
        //- decrease the collided player's hp if it's an enemy
        //- check the collisions with impassable tiles
        if(self.timer++ > self.lifetime){
            self.toRemove = true;
        }else{
            //collision player vs bullet
            for(let i in game.PLAYER_LIST){
                //TODO make the below if block a function for better readability
                //if(PLAYER_LIST[i].getDistanceSquared(self) < (a=PLAYER_LIST[i].playerSize/2)*a && !(PLAYER_LIST[i]===self.owner)){
                //check that the bullet is collided with a player that is not yourself
                if(self.isCollidedWithPlayer(game.PLAYER_LIST[i]) && !(game.PLAYER_LIST[i]===self.owner)){
                    //check that the collided player is not in the same team
                    if(game.PLAYER_LIST[i].team != self.owner.team){
                        //game.PLAYER_LIST[i].decreaseHp(self.damage);
                        game.decreaseHp(game.PLAYER_LIST[i], self.damage);
                    }
                    self.toRemove = true;
                    return
                }
            }
            //collision bot vs bullet
            let opponentTeam = 0;
            if(self.team==0){
                opponentTeam = 1;
            }
            for(let i in game.BOT_TEAMS[opponentTeam]){
                if(self.isCollidedWithBot(game.BOT_TEAMS[opponentTeam][i])){
                    game.decreaseHp(game.BOT_TEAMS[opponentTeam][i], self.damage);
                    self.toRemove = true;
                }
            }
            //for(let i=0; i<game.BOT_TEAMS[opponentTeam].length; i++){
            //    if(self.isCollidedWithBot(game.BOT_TEAMS[opponentTeam][i])){
            //        game.decreaseHp(game.BOT_TEAMS[opponentTeam][i]);
            //        self.toRemove = true;
            //    }
            //}
        }
        let dstTileX = Math.floor((self.x+self.spdX)/game.map.tileSize);
        let dstTileY = Math.floor((self.y+self.spdY)/game.map.tileSize);
        let tileId = dstTileX+dstTileY*game.map.numTileHorizontal;

        if(tileId in game.map.IMPASSABLE_TILE_LIST){
            self.toRemove = true;
            if(game.map.OBJECT_TILE_ARRAY[tileId].type == "core"){
                //game.TEAM_LIST[OBJECT_TILE_ARRAY[tileId].team].decreaseCoreHp(self.damage);
                if(game.map.OBJECT_TILE_ARRAY[tileId].team != self.owner.team){
                    game.decreaseHp(game.TEAM_LIST[game.map.OBJECT_TILE_ARRAY[tileId].team].core, self.damage);
                }
            }
        }else{
            self.x += self.spdX;
            self.y += self.spdY;
        }
    };
    self.id = game.generateBulletId();
    game.BULLET_LIST[self.id] = self;
    return self;
}
let Player = function(game){
    let self = new Creature();
    self.hp = val.default_player_hp;
    self.spd = val.default_player_speed;
    //key (and mouse) state
    self.keyStates = {};
    self.keyStates.W = false;
    self.keyStates.A = false;
    self.keyStates.S = false;
    self.keyStates.D = false;
    self.keyStates.MOUSE_LEFT= false;
    self.keyStates.MOUSE_RIGHT = false;
    self.mouseAngle = 0;
    
    //whether this player can attack now or not
    self.attackTF = false;
    self.attackRate = val.player_attack_rate; // bigger number for less bullets per second
    self.attackCount = self.attackRate;

    //player's parameter
    self.exp = 0;
    self.team = 0; //x: 0, y: 1

    //player's parameter related to grphics
    self.size = val.player_size;
    self.x = 60;
    self.y = 60;
    self.visibleWidth = val.default_visible_width;
    self.visibleHeight = val.default_visible_height;

    //functions
    self.attack = function(){
        new Bullet(game,self,self.mouseAngle, 2)
        //console.log("attack")
    }
    self.assignSpd = function(){
        //checks the keyStates and reassigns proper SpdX/Y
        self.spdX = 0;
        self.spdY = 0;
        self.spdY += self.keyStates.W ? -self.spd : 0;
        self.spdX += self.keyStates.A ? -self.spd : 0;
        self.spdY += self.keyStates.S ? self.spd : 0;
        self.spdX += self.keyStates.D ? self.spd : 0;
        if(self.spdX!=0 && self.spdY!=0){
            self.spdX /= Math.SQRT2;
            self.spdY /= Math.SQRT2;
        }   
    }
    
    self.incExp = function(type){
        switch(type){
            case "PLAYER_KILL":
                self.exp += 20;
                break;
            case "MOB_KILL":
                self.exp += 2;
                break;
        }
    }
    
    self.update = function(map){
        //- changing the spdX and spedY depending on te keyinputs
        //- changing the position according to the spd
        //- attack if attackTF is true and the condition allows attacking

        //reassign spdX and Y because they might be set 0 for collision handling
        self.assignSpd();
        //collision player object
        self.adjustSpd4Collision(map);
        //console.log("self.spd X: " + self.spdX + " " + self.spdY);
        //update current position
        self.x += self.spdX;
        self.y += self.spdY;
        //update currnet tile
        self.tileX = Math.floor(self.x/val.tile_size);
        self.tileY = Math.floor(self.y/val.tile_size);
        //increment attackCount
        if(self.attackCount < self.attackRate){
            self.attackCount += 1;
        }
        //check attack input
        if(self.attackTF){
            //check the attack count and rate
            if(self.attackCount >= self.attackRate){
                self.attackCount = 0;
                self.attack();
            }
            //self.spd = val.default_player_speed*0.5;
        }else{
            //self.spd = val.default_player_speed;
        }
    }
    
    self.keyHandler = function(){
        //- called everytime key is pressed
        self.assignSpd();
        self.mouseAngle = self.keyStates.MOUSE_ANGLE;
        self.attackTF = self.keyStates.MOUSE_LEFT;
    }
    //upon connection
    self.onConnect = function(socket){
        //- called upon connection i.e. right after this object is generated
        //- defines what types of socket.io messages to recieve
        socket.on('keyPress', function(data){
            self.keyStates[data.inputId] = data.state;
            //console.log(data.inputId + " " + self.keyStates[data.inputId] + " " + data.state)
            self.keyHandler();
        });
    };
    return self;
}
let Building = function(game, id){
    let self = Entity();
    for(let i in game.map.buildingList[id]){
        self[i] = game.map.buildingList[id][i];
    }
    game.BUILDING_LIST[id] = self;
    return self;
}
let Core = function(game, id){
    let self = Building(game, id)
    self.update = function(){
        //--call the gameOver of team method if the core is dead
        if(!self.isAlive){
            game.team.gameOver();
        }
        coreData = {
            hp:self.hp,
        }
        return coreData;
    }
    return self;
}

let Tower = function(game, team, type, id){
    self = new Creature();
    self.id = id;
    self.team = team;
    self.engagemetDst = val.twoer_engage_dst;
    self.size = val.tower_size;
    self.toRemove = false;
    self.target = null;
    self.attackCount = 0;
    self.attackRate = val.tower_attack_rate;
    self.attack = function(angle){
        new Bullet(self.game, self, angle, 2)
    }
    self.update = function(){
        if(this.self.hp<=0){
            self.toRemove = true;
            return;
        }
        if(self.target!==null){
            let tangle = Math.atan2(self.target.y-self.y, self.target.x-self.x)/Math.PI*180;
            if(self.attackCount >= self.attackRate){
                self.attack(tangle);
                self.attackCount = 0;
            }else{
                self.attackCount += 1;
            }
        }
    }
    return self;
}
let Team = function(game, id){
    let self = {};
    self.teamId = id;
    if(id == 0){
        self.core = new Core(game, 'core0');
    }else if(id == 1){
        self.core = new Core(game, 'core1');
    }
    self.gameOver = function(){
        game.gameOver(self.teamId);
    }
    self.update = function(){
        //- check win or lose
        self.core.update()
    }
    return self;
}

//game class
let Game = function(id){
    let self = {};
    self.id = id;
    self.map = new mapdata.MapData1();
    self.BULLET_COUNT = 0;
    self.BUILDING_COUNT = 0;
    self.SOCKET_LIST = {};
    self.SOCKET_COUNT = 0;
    self.PLAYER_LIST = {};
    self.PLAYER_GRAY_ZONE_LIST = {};
    self.BOT_LIST = {};
    self.BOT_TEAMS = {0:{},1:{}};
    self.BOT_COUNT = 0;
    self.BULLET_LIST = {};
    self.BUILDING_COUNT = 0;
    self.BUILDING_LIST = {};
    self.TOWER_LIST = {};

    self.botGenTimeList = [];
    self.TEAM_LIST = {};
    self.newData = {}
    //generate map
    //create teams
    self.TEAM_LIST[0] = new Team(self, 0);
    self.TEAM_LIST[1] = new Team(self, 1);
    //init game values
    self.DEFAULT_PLAYER_HP = val.default_player_hp;
    self.DEFAULT_SERVER_FPS = val.default_server_fps;

    self.isGameOver = false;
    self.loser =null;

    self.init = function(){
        //set the time to generate bots
        self.botGenTimeList = [];
        let curtime = 0;
        while(curtime+val.bot_gen_interval<val.game_time_max){
            self.botGenTimeList.push(curtime);
            curtime += val.bot_gen_interval;
        }
    }
    
    self.assignTeam = function(player){
        if(self.SOCKET_COUNT%2 == 1){
            player.team = 0 //x
        }else{
            player.team = 1 //y
        }
    }
    self.generateBulletId = function(){
        self.BULLET_COUNT += 1;
        return self.BULLET_COUNT;
    }
    self.generateBotId = function(){
        self.BOT_COUNT += 1;
        return self.BOT_COUNT;
    }
    self.gameOver = function(teamId){
        self.loser = teamId;
        self.gameOver = true;
    }
    self.decreaseHp = function(entity, damage){
        entity.decreaseHp(damage);
    }
    self.generateBots = function(){
        let maxi = 5;
        for(let i=0; i<maxi; i++){
            let bot00 = new Bot(self, 0,val.team_0_bot_path_0.concat(), maxi-i, this.generateBotId());
            let bot10 = new Bot(self, 1,val.team_0_bot_path_0.concat().reverse(), maxi-i, this.generateBotId());
            let bot01 = new Bot(self, 0,val.team_0_bot_path_1.concat(), maxi-i, this.generateBotId());
            let bot11 = new Bot(self, 1,val.team_0_bot_path_1.concat().reverse(), maxi-i, this.generateBotId());
            let bot02 = new Bot(self, 0,val.team_0_bot_path_2.concat(), maxi-i, this.generateBotId());
            let bot12 = new Bot(self, 1,val.team_0_bot_path_2.concat().reverse(), maxi-i, this.generateBotId());
            bot00.y += i*15;
            bot01.x += i*10;
            bot01.y += i*10;
            bot02.x += i*15;
            bot10.y -= i*15;
            bot11.x -= i*10;
            bot11.y -= i*10;
            bot12.x -= i*15;
            self.BOT_LIST[bot00.id] = bot00;
            self.BOT_LIST[bot01.id] = bot01;
            self.BOT_LIST[bot02.id] = bot02;
            self.BOT_LIST[bot10.id] = bot10;
            self.BOT_LIST[bot11.id] = bot11;
            self.BOT_LIST[bot12.id] = bot12;

            self.BOT_TEAMS[0][bot00.id] = bot00;
            self.BOT_TEAMS[0][bot01.id] = bot01;
            self.BOT_TEAMS[0][bot02.id] = bot02;
            self.BOT_TEAMS[1][bot10.id] = bot10;
            self.BOT_TEAMS[1][bot11.id] = bot11;
            self.BOT_TEAMS[1][bot12.id] = bot12;
            //self.BOT_TEAMS[0].push(bot00);
            //self.BOT_TEAMS[0].push(bot01);
            //self.BOT_TEAMS[0].push(bot02);
            //self.BOT_TEAMS[1].push(bot10);
            //self.BOT_TEAMS[1].push(bot11);
            //self.BOT_TEAMS[1].push(bot12);
        }
    } 
    self.updatePlayer = function(){
        let playerData = [];
        self.PLAYER_GRAY_ZONE_LIST = {};
        for(let i in self.PLAYER_LIST){
            let player = self.PLAYER_LIST[i]; 
            player.update(self.map);
            let tileId = player.tileX+player.tileY*self.map.numTileHorizontal;
            if(tileId in self.map.OBJECT_TILE_ARRAY){
                if(self.map.OBJECT_TILE_ARRAY[tileId].type == "gray_zone"){
                    self.PLAYER_GRAY_ZONE_LIST[i] = player;
                }
            }
            playerData.push({
                x: player.x,
                y: player.y,
                team: player.team,
                hp: player.hp,
            });
        }
        return playerData;
    };
    self.updateBullet = function(){
        let bulletData = [];
        for(let i in self.BULLET_LIST){
            let bullet = self.BULLET_LIST[i];
            bullet.update(self)
            if(bullet.toRemove){
                delete self.BULLET_LIST[i];
            }else{
                bulletData.push({
                    origin: bullet.origin,
                    x:bullet.x,
                    y:bullet.y,
                    spdX:bullet.spdX,
                    spdY:bullet.spdY,
                });
            }
        }
        return bulletData;
    };
    self.updateTeam = function(){
        let teamData = {};
        for(let i in self.TEAM_LIST){
            self.TEAM_LIST[i].update();
        }
        return teamData;
    }
    self.updateBuilding = function(){
        let buildingData = {};
        for(let i in self.BUILDING_LIST){
            let building = self.BUILDING_LIST[i];
            building.update();
            buildingData[i] = {
                hp:building.hp,
            };
        }
        return buildingData;
    }
    self.updateBotTarget = function(bot){
        bot.target = null;
        let opponentTeam = 0;
        if(bot.team==0){
            opponentTeam = 1;
        }
        //for(let i=0; i<self.BOT_TEAMS[opponentTeam].length; i++){
        //    if(bot.getDistanceSquared(self.BOT_TEAMS[opponentTeam][i]) < bot.engagemetDst*bot.engagemetDst){
        //        bot.target = self.BOT_TEAMS[opponentTeam][i];
        //        return;
        //    }
        //}
        for(let i in self.BOT_TEAMS[opponentTeam]){
            if(bot.getDistanceSquared(self.BOT_TEAMS[opponentTeam][i]) < bot.engagemetDst*bot.engagemetDst){
                bot.target = self.BOT_TEAMS[opponentTeam][i];
                return;
            }
        }
        //for(let i in self.PLAYER_LIST){
        //    if(self.PLAYER_LIST[i].team != opponentTeam){
        //        continue;
        //    }
        //    if(bot.getDistanceSquared(self.PLAYER_LIST[i])<bot.engagemetDst*bot.engagemetDst){
        //        bot.target = self.PLAYER_LIST[i];
        //        return;
        //    }
        //}
        let curClosestDst = 2147483648
        for(let i in self.PLAYER_LIST){
            if(self.PLAYER_LIST[i].team != opponentTeam){
                continue;
            }else if(i in self.PLAYER_GRAY_ZONE_LIST){
                continue;
            }
            let dstSqr = bot.getDistanceSquared(self.PLAYER_LIST[i])
            if(bot.getDistanceSquared(self.PLAYER_LIST[i])<bot.engagemetDst*bot.engagemetDst){
                if(dstSqr < curClosestDst){
                    bot.target = self.PLAYER_LIST[i];
                    curClosestDst = dstSqr
                }
            }
        }
    }
    self.updateBot = function(){
        let botData = [];
        for(let i in self.BOT_LIST){
            let bot = self.BOT_LIST[i];
            self.updateBotTarget(bot);
            bot.update(self.map);
            if(bot.toRemove){
                delete self.BOT_LIST[i];
                delete self.BOT_TEAMS[bot.team][i];
            }else{
                botData.push({
                    x:bot.x,
                    y:bot.y,
                    team:bot.team,
                    hp:bot.hp,
                });
            }
        }
        return botData;
    }
    self.getVisiblePlayers = function(playerSelf, playerData){
        let playerDataVisible = [];
        for(let i = 0; i < playerData.length; i++){
            player = playerData[i];
            if(Math.abs(player.x-playerSelf.x) < val.default_visible_width/2+50 && Math.abs(player.y-playerSelf.y) < val.default_visible_height/2+50){
                playerDataVisible.push(player);
            }
        }
        return playerDataVisible;
    }
    self.getVisibleBullets = function(playerSelf, bulletData){
        let bulletDataVisible = [];
        for(let i=0; i<bulletData.length; i++){
            bullet = bulletData[i];
            if(Math.abs(bullet.x-playerSelf.x) < val.default_visible_width/2+50 && Math.abs(bullet.y-playerSelf.y) < val.default_visible_height/2+50){
                bulletDataVisible.push(bullet);
            }
        }
        return bulletDataVisible;
    }
    self.getVisibleBots = function(playerSelf, botData){
        let botDataVisible = [];
        for(let i=0; i<botData.length;i++){
            bot = botData[i];
            if(Math.abs(bot.x-playerSelf.x) < val.default_visible_width/2+50 && Math.abs(bot.y-playerSelf.y) < val.default_visible_height/2+50){
                botDataVisible.push(bot);
            }
        }
        return botDataVisible;
    }
    self.getVisibleTeam = function(playerSelf, teamData){
        return teamData[playerSelf.team];
    }
    self.getVisibleBuildings = function(playerSelf, buildingData){
        //- buildingData is all visible
        return buildingData;
    }
    self.getVisilbeComponents = function(playerSelf, newData){
        //- returns the lists of visible bullets and players from the point of view of given player
        return {bullets:self.getVisibleBullets(playerSelf, newData.bulletData),
                players:self.getVisiblePlayers(playerSelf, newData.playerData),
                team:self.getVisibleTeam(playerSelf, newData.teamData),
                buildings:self.getVisibleBuildings(playerSelf,newData.buildingData),
                bots:self.getVisibleBots(playerSelf, newData.botData),
            };
    }
    self.update = function(){
        let newData = {};
        newData.playerData = self.updatePlayer();
        newData.bulletData = self.updateBullet();
        newData.teamData = self.updateTeam();
        newData.buildingData = self.updateBuilding();
        newData.botData = self.updateBot();
        return newData;
    }
    //socket is added
    self.addSocket = function(socket){
        //-add the given socket to SOCKET_LIST
        //-create a player and initialize
        //-send initData
        let player = new Player(self);
        self.SOCKET_LIST[socket.id] = socket;
        self.PLAYER_LIST[socket.id] = player;
        self.SOCKET_COUNT += 1;
        self.assignTeam(player)
        player.onConnect(socket);
        socket.emit("initData", {
            tileSize: val.tile_size,
            givenWidth: val.default_visible_width,
            givenHeight: val.default_visible_height,
            playerSize: val.player_size,
            val: val,
            buildingList: self.map.buildingList,
            towerList: self.map.towerList,
        });
        socket.on('disconnect', function(){
            delete self.SOCKET_LIST[socket.id];
            delete self.PLAYER_LIST[socket.id]
            self.SOCKET_COUNT -= 1;
            console.log(socket.id + " disconnected");
            if(self.SOCKET_COUNT == 0){
                //call the function to delete this game instance
                deleteGame(self.id);
            }
        });
    }

    //game loop
    self.startTime = Date.now();
    self.timeElapsed = 0;
    self.init();
    let botGenCount = 0;
    setInterval(function(){
        self.newData = self.update();
        self.timeElapsed = Date.now() - self.startTime;
        if(self.botGenTimeList[0]<self.timeElapsed){
            self.generateBots();
            self.botGenTimeList.shift();
        }
        for(let i in self.SOCKET_LIST){
            let socket = self.SOCKET_LIST[i];
            let player = self.PLAYER_LIST[socket.id];
            //let visibleComponents =self.get_visilbe_components(player, playerData);
            let visibleComponents = self.getVisilbeComponents(player, self.newData)
            let bulletDataVisible = visibleComponents.bullets;
            let playerDataVisible = visibleComponents.players;
            let teamDataVisible = visibleComponents.team;
            let buildingDataVisible = visibleComponents.buildings;
            let botDataVisible = visibleComponents.bots;
            let data = {
                playerSelf: {
                    x:player.x,
                    y:player.y,
                    hp:player.hp,}, 
                player: playerDataVisible,
                bullet: bulletDataVisible,
                team: teamDataVisible,
                building: buildingDataVisible,
                bot: botDataVisible,
            };
            //console.log(data.playerSelf);
            socket.emit('newData', data);
            //console.log('newData sent')
        }
    }, 1000/self.DEFAULT_SERVER_FPS);   
    return self;
};