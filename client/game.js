//game.js

//game values
var DEFAULT_CLIENT_FPS = 45;
//usually W:H = 16:9
var WINDOW_WIDTH = window.screen.width;
var WINDOW_HEIGHT = window.screen.height;

var Game = function(){
    let self = {};
    //fields
    self.socket = io();
    self.canvasMain = document.getElementById("canvasMain");
    self.canvasUi = document.getElementById("canvasUi");
    self.canvasInfo = document.getElementById("canvasInfo")
    self.ctx    = self.canvasMain.getContext("2d");
    self.ctxui  = self.canvasUi.getContext("2d");
    self.ctxinfo = self.canvasInfo.getContext("2d");
    self.infoDiv = document.getElementById("infoDiv");
    self.ctxui.font = '20px serif';
    self.ctxinfo.font = '20px serif';
    self.Img    = {};
    self.data = {}
    self.mapData = {};
    self.loadImgCount = 0
    self.buildingList = {};

    self.playerTileX = 0;
    self.playerTileY = 0;

    //below are reinitialized with once initData arrives
    self.tileSize = 20;
    self.givenWidth = 500;
    self.givenHeight = 500;
    self.playerSize = 20;

    //decide which is shorter than needed
    self.canvasMain.width = window.innerWidth;
    self.canvasMain.height = window.innerHeight;

    self.scale = 1;
    if(self.canvasMain.width > self.canvasMain.height){
        self.subWidth = self.givenWidth;
        self.subHeight = self.subWidth*self.canvasMain.height/self.canvasMain.width;
        self.scale = self.canvasMain.width/self.subWidth;
    }else{
        self.subHeight = self.givenHeight;
        self.subWidth = self.subHeight*self.canvasMain.width/self.canvasMain.height;
        self.scale = self.canvasMain.height/self.subHeight;
    }
    self.update = function(){
        //update building params for each building
        for(let bid in self.buildingList){
            if(bid in self.data.building){
                for(let bp in self.data.building[bid]){
                    self.buildingList[bid][bp] = self.data.building[bid][bp];
                }
            }
        }
    }
    //methods
    self.socketOn = function(){
        self.socket.on('initData', function(data){
            self.tileSize = data.tileSize;
            self.givenWidth = data.givenWidth;
            self.givenHeight = data.givenHeight;
            self.playerSize = data.playerSize;
            self.val = data.val;
            self.buildingList = data.buildingList;
        })
        self.socket.on('newData', function(data){
            self.data = data;
            self.update();
            //recalculate the cuurent tile
            self.playerTileX = Math.floor(self.data.playerSelf.x/self.tileSize);
            self.playerTileY = Math.floor(self.data.playerSelf.y/self.tileSize);
        });
    };

    self.loadImg = function(){
        self.Img.wall = new Image();
        self.Img.wall.addEventListener('load', function(){
            self.loadImgCount += 1;
        }, false)
        self.Img.wall.src = "./client/img/wall0.png";
        self.Img.wall1 = new Image();
        self.Img.wall1.addEventListener('load', function(){
            self.loadImgCount += 1;
        }, false)
        self.Img.wall1.src = "./client/img/wall1.png";
        self.Img.bush = new Image();
        self.Img.bush.addEventListener('load', function(){
            self.loadImgCount += 1;
        }, false)
        self.Img.bush.src = "./client/img/bush.png";
        self.Img.water = new Image();
        self.Img.water.addEventListener('load', function(){
            self.loadImgCount += 1;
        }, false)
        self.Img.water.src = "./client/img/water.png";
    }
    self.loadMap = function(){
        let requestURL = location.href+"client/map/map1.json";
        let request = new XMLHttpRequest();
        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();
        request.onload = function(){
            self.mapData.OBJECT_TILE_LIST = request.response;
            console.log("map recieved")
        }
    }
    self.getCanvasCoords = function(x,y){
        let coordX = Math.round((x - self.data.playerSelf.x + self.subWidth/2)*self.scale); //displacement from the playerSelf on canvas 
        let coordY = Math.round((y - self.data.playerSelf.y + self.subHeight/2)*self.scale); //displacement from the playerSelf on canvas 
        return [coordX, coordY];
    }
    self.TileCoords2CanvasCoords = function(x,y){
        return self.getCanvasCoords(x*self.tileSize, y*self.tileSize);
    }
    self.drawBot = function(bot){
        let coordXY = self.getCanvasCoords(bot.x, bot.y)
        if(bot.team == 0){
            self.ctx.fillStyle = "#FF0000";
        }else if(bot.team==1){
            self.ctx.fillStyle = "#0000FF";
        }
        self.ctx.beginPath();
        self.ctx.arc(coordXY[0], coordXY[1], self.val.bot_size/2*self.scale, 0, 2 * Math.PI);
        self.ctx.fill();
    }
    //pass the absolute position on the game map
    self.drawPlayer = function(player){
        //find the displacement
        //self.ctx.fillStyle = "#FF0000";
        let coordXY = self.getCanvasCoords(player.x, player.y);
        self.ctx.fillStyle = "#F7C39C";
        self.ctx.beginPath();
        self.ctx.arc(coordXY[0], coordXY[1], self.playerSize/2*self.scale, 0, 2 * Math.PI);
        self.ctx.fill();
        if(player.team==0){
            self.ctx.fillStyle = "#FF8888";
        }else if(player.team==1){
            self.ctx.fillStyle = "#8888FF";
        }
        self.ctx.beginPath();
        self.ctx.arc(coordXY[0], coordXY[1], self.playerSize/4*self.scale, 0, 2 * Math.PI);
        self.ctx.fill();
        //draw hp bar
        self.ctx.fillStyle = "#FFAAAA";
        self.ctx.fillRect(coordXY[0]-10*self.scale, coordXY[1]-(self.playerSize/2+6)*self.scale, player.hp/self.val.default_player_hp*20*self.scale, 2*self.scale)
    };
    //pass the absolute position on the game map
    self.drawBullet = function(x,y, spdX, spdY){
        let coordXY = self.getCanvasCoords(x, y);
        self.ctx.strokeStyle = "black";
        self.ctx.lineWidth = 2;
        self.ctx.beginPath();
        self.ctx.moveTo(coordXY[0], coordXY[1]);
        self.ctx.lineTo(coordXY[0] - spdX*2*self.scale, coordXY[1] - spdY*2*self.scale);
        self.ctx.stroke();

    };
    self.drawObj = function(obj){
        let coordXY = null;
        switch(obj.type){
            case 'wall':
                //self.ctx.fillStyle = "brown";
                coordXY = self.TileCoords2CanvasCoords(obj.x, obj.y);
                //console.log(coordXY);
                //self.ctx.fillRect(coordXY[0]-1, coordXY[1]-1, self.tileSize*self.scale+1, self.tileSize*self.scale+1);
                if(obj.shape==1){
                    self.ctx.drawImage(self.Img.wall1, coordXY[0]-1, coordXY[1]-1, self.tileSize*self.scale+1, self.tileSize*self.scale+1);
                }else{
                    self.ctx.drawImage(self.Img.wall, coordXY[0]-1, coordXY[1]-1, self.tileSize*self.scale+1, self.tileSize*self.scale+1);
                }
                break;
            case 'bush':
                //self.ctx.fillStyle = "green";
                coordXY = self.TileCoords2CanvasCoords(obj.x, obj.y);
                self.ctx.drawImage(self.Img.bush, coordXY[0]-1, coordXY[1]-1, self.tileSize*self.scale+1, self.tileSize*self.scale+1);
                //self.ctx.fillRect(coordXY[0]-1, coordXY[1]-1, self.tileSize*self.scale+1, self.tileSize*self.scale+1);
                break;
            case 'water':
                //self.ctx.fillStyle = "cyan";
                coordXY = self.TileCoords2CanvasCoords(obj.x, obj.y);
                self.ctx.drawImage(self.Img.water, coordXY[0]-1, coordXY[1]-1, self.tileSize*self.scale+1, self.tileSize*self.scale+1);
                //self.ctx.fillRect(coordXY[0]-1, coordXY[1]-1, self.tileSize*self.scale+1, self.tileSize*self.scale+1);
                break;
            case 'core':
                coordXY = self.TileCoords2CanvasCoords(obj.x, obj.y);
                this.ctx.fillStyle = "#00FF00"
                //self.ctx.drawImage(self.Img.water, coordXY[0]-1, coordXY[1]-1, self.tileSize*self.scale+1, self.tileSize*self.scale+1);
                self.ctx.fillRect(coordXY[0]-1, coordXY[1]-1, self.tileSize*self.scale+1, self.tileSize*self.scale+1);
                break;
                
        }
    }
    self.drawBuildings = function(){
        let coordXY = null;
        for(let i in self.buildingList){
            let building = self.buildingList[i];
            switch(building.type){
                case 'core':
                    //draw hp bar
                    coordXY = self.getCanvasCoords(building.x-building.width/2, building.y-building.height/2)
                    self.ctx.fillStyle= "#FF0000";
                    self.ctx.fillRect(coordXY[0],coordXY[1]-5*self.scale,building.hp/building.maxHp*80*self.scale, 3*self.scale)
            }
            
        }
    }

    self.drawBackground = function(){
        //draw grids
        let cornerX = self.data.playerSelf.x - self.subWidth/2 //visible left limit
        let cornerY = self.data.playerSelf.y - self.subHeight/2 //visible upper limit
        let offsetX = cornerX%self.tileSize;
        let offsetY = cornerY%self.tileSize;
        //vertical lines
        self.ctx.lineWidth=3;
        self.ctx.strokeStyle = "rgba(0,0,0,0.1)";
        for(let i = -1; i < self.subWidth/self.tileSize + 2; i++){
            self.ctx.beginPath();
            let coordXY = self.getCanvasCoords(cornerX - offsetX + i*self.tileSize, 0);
            self.ctx.moveTo(coordXY[0], 0);
            self.ctx.lineTo(coordXY[0], self.canvasMain.height);
            self.ctx.stroke();
        }
        //vertical lines
        for(let i = -1; i < self.subHeight/self.tileSize + 2; i++){
            self.ctx.beginPath();
            let coordXY = self.getCanvasCoords(0, cornerY - offsetY + i*self.tileSize);
            self.ctx.moveTo(0, coordXY[1]);
            self.ctx.lineTo(self.canvasMain.width, coordXY[1]);
            self.ctx.stroke();
        }
    }
    self.isObjectVisible = function(obj){
        //console.log("playerSelf.tileX: " + self.data.playerSelf.tileX + " playerSelf.tileY: " + self.data.playerSelf.tileY);
        if(Math.abs(self.playerTileX-obj.x)<(self.givenWidth/2/self.tileSize)+1&& Math.abs(self.playerTileY-obj.y)<(self.givenHeight/2/self.tileSize)+1){
            return true;
        }else{
            return false;
        }
    }
    self.drawMapObjects = function(){
        //draw map ojects
        for(i in self.mapData.OBJECT_TILE_LIST){
            var obj = self.mapData.OBJECT_TILE_LIST[i];
            if(self.isObjectVisible(obj)){
                self.drawObj(obj);
            }
        }
    }
    self.drawUi = function(){
        self.ctxinfo.fillStyle = "red";
        self.ctxinfo.fillRect(0,0, self.data.playerSelf.hp/100*self.canvasInfo.width, 30)
        self.ctxinfo.fillStyle = "white";
        self.ctxinfo.font = '20px serif';
        self.ctxinfo.fillText(""+self.data.playerSelf.hp, 0,20);
    }
    self.draw = function(){
        if(self.loadImgCount < 3){
            console.log("images not loaded yet")
            return
        }
        self.drawBackground();
        //draws all bullets
        for(let i in self.data.bullet){
            self.drawBullet(self.data.bullet[i].x, self.data.bullet[i].y, self.data.bullet[i].spdX, self.data.bullet[i].spdY);
        }
        
        //draws all player
        for(let i in self.data.player){
            //self.drawPlayer(self.data.player[i].x, self.data.player[i].y);
            self.drawPlayer(self.data.player[i]);
        }
        self.drawMapObjects();
        self.drawBuildings();
        for(let i in self.data.bot){
            self.drawBot(self.data.bot[i]);
        }
        self.drawUi();
    }
    self.startGameLoop = function(){
        setInterval(function(){
            self.ctx.clearRect(0,0, self.canvasMain.width, self.canvasMain.height);
            self.ctxinfo.clearRect(0,0, self.canvasInfo.width, self.canvasInfo.height);
            //update the scale
            //self.widthScale = self.canvasMain.width/self.data.playerSelf.visibleWidth;
            //self.heightScale = self.canvasMain.height/self.data.playerSelf.visibleHeight;
            self.draw();
        },1000/DEFAULT_CLIENT_FPS);
    };
    //mothods -- key listeners
    document.onkeydown = function(event){
        if(event.keyCode === 68){   //d
            self.socket.emit('keyPress',{inputId:'D',state:true});
        }else if(event.keyCode === 83){ //s
            self.socket.emit('keyPress',{inputId:'S',state:true});
        }else if(event.keyCode === 65){ //a
            self.socket.emit('keyPress',{inputId:'A',state:true});
        }else if(event.keyCode === 87){ //w
            self.socket.emit('keyPress',{inputId:'W',state:true});
        }
    }
    document.onkeyup = function(event){
        if(event.keyCode === 68){   //d
            self.socket.emit('keyPress',{inputId:'D',state:false});
        }else if(event.keyCode === 83){ //s
            self.socket.emit('keyPress',{inputId:'S',state:false});
        }else if(event.keyCode === 65){ //a
            self.socket.emit('keyPress',{inputId:'A',state:false});
        }else if(event.keyCode === 87){ //w
            self.socket.emit('keyPress',{inputId:'W',state:false});
        }
    }
    document.onmousedown = function(event){
        if(event.button === 0){
            self.socket.emit('keyPress',{inputId:'MOUSE_LEFT',state:true});
        }
    }
    document.onmouseup = function(event){
        if(event.button === 0){
            self.socket.emit('keyPress',{inputId:'MOUSE_LEFT',state:false});
        }
    }
    document.onmousemove = function(event){
		var x = -self.canvasMain.width/2 + event.clientX;
        var y = -self.canvasMain.height/2 + event.clientY;
        //x = x/self.widthScale;
        //y = y/self.heightScale;
        var angle = Math.atan2(y,x) / Math.PI * 180;
        //self.ctx.strokeStyle = "black";
        //self.ctx.beginPath();
        //self.ctx.moveTo(self.canvasMain.width/2, self.canvasMain.height/2);
        //self.ctx.lineTo(event.clientX, event.clientY);
        //self.ctx.stroke();
		self.socket.emit('keyPress',{inputId:'MOUSE_ANGLE',state:angle});
	}
    return self;
};

game = new Game();  //new game insance created
game.loadImg();     //load images
game.loadMap();
game.socketOn();    //start recieving the data
game.startGameLoop();   //start the main game loop