var val = require("./val.js");
var MapData = function(){
        let self = {};
        
        self.OBJECT_LIST = {};
        self.mapWidth = val.map_width;
        self.mapHeight = val.map_height;
        self.numTileHorizontal = val.map_width/val.tile_size; //800
        self.numTileVertical = val.map_height/val.tile_size;
        self.tileSize = val.tile_size;
        self.OBJECT_TILE_LIST = {};
        self.IMPASSABLE_TILE_LIST = {};


        self.spawnLocationRed = 0
        self.spawnLocationBlue = self.numTileHorizontal*self.numTileVertical;
    
        self.getTile = function(x,y){
            if(x+self.numTileHorizontal*y in self.OBJECT_TILE_LIST){
                return self.OBJECT_TILE_LIST[x+self.numTileVertical*y];
            }
            return null;
        }
        self.csv2array = function(filename){
        }
        return self;
}
module.exports = {
    MapData1: function(){
        self = new MapData();
        self.OBJECT_TILE_ARRAY = require('./client/map/map1.json')
        self.MAP_ARRAY = [];

        //self.OBJECT_TILE_ARRAY = [
        //    {
        //        x: 1,
        //        y: 0,
        //        type:"tree",
        //        passable:false,
        //    },
        //]

        //for(let i = 0; i < self.OBJECT_TILE_ARRAY.length; i++){
        //for(let i = 0; i<self.numTileHorizontal*self.numTileVertical; i++){
        //    if(i in self.OBJECT_TILE_ARRAY){
        //        self.MAP_ARRAY.push(self.OBJECT_TILE_ARRAY[i].type);
        //    }else{
        //        self.MAP_ARRAY.push(0);
        //    }
        //}

        for(i in self.OBJECT_TILE_ARRAY){
            let tile = self.OBJECT_TILE_ARRAY[i];
            let id = tile.x+tile.y*self.numTileHorizontal;
            self.OBJECT_TILE_LIST[id] = tile;
            if(!tile.passable){
                self.IMPASSABLE_TILE_LIST[id] = tile;
            }
        }

        self.buildingList = {
            "core0":{
                x:8*val.tile_size,
                y:8*val.tile_size,
                type:"core",
                team: 0,
                width:4*val.tile_size,
                height:4*val.tile_size,
                hp:val.default_core_hp,
                maxHp:val.default_core_hp,
            },
            "core1":{
                x:92*val.tile_size,
                y:92*val.tile_size,
                type:"core",
                team: 1,
                width:4*val.tile_size,
                height:4*val.tile_size,
                hp:val.default_core_hp,
                maxHp:val.default_core_hp,
            }
        }
        self.towerList = {
            "tower00":{
                x:18*val.tile_size,
                y:18*val.tile_size,
                type:"tower",
                team: 0,
                hp:val.default_tower_hp,
                maxHp: val.default_tower_hp,
            }
        }
        return self;
    },
}