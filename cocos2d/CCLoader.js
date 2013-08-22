/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011      Zynga Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

/**
 * resource type
 * @constant
 * @type Object
 */
cc.RESOURCE_TYPE = {
    "IMAGE": ["png", "jpg", "bmp","jpeg","gif"],
    "SOUND": ["mp3", "ogg", "wav", "mp4", "m4a", "aifc"],
    "XML": ["plist", "xml", "fnt", "tmx", "tsx"],
    "BINARY": ["ccbi"],
    "FONT": "FONT",
    "TEXT":["txt", "vsh", "fsh","json", "csv"],
    "UNKNOW": []
};

/**
 * A class to pre-load resources before engine start game main loop.
 * @class
 * @extends cc.Scene
 */
cc.Loader = cc.Class.extend(/** @lends cc.Loader# */{
    _curNumber: 0,
    _totalNumber: 0,
    _loadedNumber: 0,
    _resources: null,
    _animationInterval: 1 / 60,
    _interval: null,
    _isAsync: false,

    /**
     * Constructor
     */
    ctor: function () {
        this._resources = [];
    },

    /**
     * init with resources
     * @param {Array} resources
     * @param {Function|String} selector
     * @param {Object} target
     */
    initWithResources: function (resources, selector, target) {
        cc.Assert(resources != null, "resources should not null");

        if (selector) {
            this._selector = selector;
            this._target = target;
        }

        if ((resources != this._resources) || (this._curNumber == 0)) {
            this._curNumber = 0;
            this._loadedNumber = 0;
            if (resources[0] instanceof Array) {
                for (var i = 0; i < resources.length; i++) {
                    var each = resources[i];
                    this._resources = this._resources.concat(each);
                }
            } else
                this._resources = resources;
        }

        //load resources
        this._schedulePreload();
    },

    setAsync: function (isAsync) {
        this._isAsync = isAsync;
    },

    /**
     * Callback when a resource file load failed.
     * @example
     * //example
     * cc.Loader.getInstance().onResLoaded();
     */
    onResLoadingErr: function (name) {
        cc.log("cocos2d:Failed loading resource: " + name);
    },

    /**
     * Callback when a resource file loaded.
     * @example
     * //example
     * cc.Loader.getInstance().onResLoaded();
     */
    onResLoaded: function () {
        this._loadedNumber++;
    },

    /**
     * Get loading percentage
     * @return {Number}
     * @example
     * //example
     * cc.log(cc.Loader.getInstance().getPercentage() + "%");
     */
    getPercentage: function () {
        var percent = 0;
        if (this._resources.length == 0) {
            percent = 100;
        } else {
            percent = (0 | (this._loadedNumber / this._resources.length * 100));
        }
        return percent;
    },

    /**
     * release resources from a list
     * @param resources
     */
    releaseResources: function (resources) {
        if (resources && resources.length > 0) {
            var sharedTextureCache = cc.TextureCache.getInstance();
            var sharedEngine = cc.AudioEngine.getInstance();
            var sharedParser = cc.SAXParser.getInstance();
            var sharedFileUtils = cc.FileUtils.getInstance();

            var resInfo;
            for (var i = 0; i < resources.length; i++) {
                resInfo = resources[i];
                var type = this._getResType(resInfo);
                switch (type) {
                    case "IMAGE":
                        sharedTextureCache.removeTextureForKey(resInfo.src);
                        break;
                    case "SOUND":
                        sharedEngine.unloadEffect(resInfo.src);
                        break;
                    case "XML":
                        sharedParser.unloadPlist(resInfo.src);
                        break;
                    case "BINARY":
                        sharedFileUtils.unloadBinaryFileData(resInfo.src);
                        break;
                    case "TEXT":
                        sharedFileUtils.unloadTextFileData(resInfo.src);
                        break;
                    case "FONT":
                        this._unregisterFaceFont(resInfo);
                        break;
                    default:
                        throw "cocos2d:unknown filename extension: " + type;
                        break;
                }
            }
        }
    },

    _preload: function () {
        this._updatePercent();

        if (this._curNumber < this._resources.length) {
            this._loadOneResource();
            this._curNumber++;
        }
    },

    _loadOneResource: function () {
        var sharedTextureCache = cc.TextureCache.getInstance();
        var sharedEngine = cc.AudioEngine.getInstance();
        var sharedParser = cc.SAXParser.getInstance();
        var sharedFileUtils = cc.FileUtils.getInstance();

        var resInfo = this._resources[this._curNumber];
        var type = this._getResType(resInfo);
        switch (type) {
            case "IMAGE":
                sharedTextureCache.addImage(resInfo.src);
                break;
            case "SOUND":
                sharedEngine.preloadSound(resInfo.src);
                break;
            case "XML":
                sharedParser.preloadPlist(resInfo.src);
                break;
            case "BINARY":
                sharedFileUtils.preloadBinaryFileData(resInfo.src);
                break;
            case "TEXT" :
                sharedFileUtils.preloadTextFileData(resInfo.src);
                break;
            case "FONT":
                this._registerFaceFont(resInfo);
                break;
            default:
                throw "cocos2d:unknown filename extension: " + type;
                break;
        }
    },


    _schedulePreload: function () {
        var _self = this;
        this._interval = setInterval(function () {
            _self._preload();
        }, this._animationInterval * 1000);
    },

    _unschedulePreload: function () {
        clearInterval(this._interval);
    },


    _getResType: function (resInfo) {
        var isFont = resInfo.fontName;
        if (isFont != null) {
            return cc.RESOURCE_TYPE["FONT"];
        } else {
            var src = resInfo.src;
            var ext = src.substring(src.lastIndexOf(".") + 1, src.length);
            for (var resType in cc.RESOURCE_TYPE) {
                if (cc.RESOURCE_TYPE[resType].indexOf(ext) != -1) {
                    return resType;
                }
            }
            return ext;
        }
    },

    _updatePercent: function () {
        var percent = this.getPercentage();

        if (percent >= 100) {
            this._unschedulePreload();
            this._complete();
        }
    },

    _complete: function () {
        if (this._target && (typeof(this._selector) == "string")) {
            this._target[this._selector](this);
        } else if (this._target && (typeof(this._selector) == "function")) {
            this._selector.call(this._target, this);
        } else {
            this._selector(this);
        }


        this._curNumber = 0;
        this._loadedNumber = 0;
    },

    _registerFaceFont: function (fontRes) {
        var srcArr = fontRes.src;
        var fileUtils = cc.FileUtils.getInstance();
        if (srcArr && srcArr.length > 0) {
            var fontStyle = document.createElement("style");
            fontStyle.type = "text/css";
            document.body.appendChild(fontStyle);

            var fontStr = "@font-face { font-family:" + fontRes.fontName + "; src:";
            for (var i = 0; i < srcArr.length; i++) {
                fontStr += "url('" + fileUtils.fullPathForFilename(encodeURI(srcArr[i].src)) + "') format('" + srcArr[i].type + "')";
                fontStr += (i == (srcArr.length - 1)) ? ";" : ",";
            }
            fontStyle.textContent += fontStr + "};";

            //preload
            //<div style="font-family: PressStart;">.</div>
            var preloadDiv = document.createElement("div");
            preloadDiv.style.fontFamily = fontRes.fontName;
            preloadDiv.innerHTML = ".";
            preloadDiv.style.position = "absolute";
            preloadDiv.style.left = "-100px";
            preloadDiv.style.top = "-100px";
            document.body.appendChild(preloadDiv);
        }
        cc.Loader.getInstance().onResLoaded();
    },

    _unregisterFaceFont: function (fontRes) {
        //todo remove style
    }
});

/**
 * Preload resources in the background
 * @param {Array} resources
 * @param {Function|String} selector
 * @param {Object} target
 * @return {cc.Loader}
 * @example
 * //example
 * var g_mainmenu = [
 *    {src:"res/hello.png"},
 *    {src:"res/hello.plist"},
 *
 *    {src:"res/logo.png"},
 *    {src:"res/btn.png"},
 *
 *    {src:"res/boom.mp3"},
 * ]
 *
 * var g_level = [
 *    {src:"res/level01.png"},
 *    {src:"res/level02.png"},
 *    {src:"res/level03.png"}
 * ]
 *
 * //load a list of resources
 * cc.Loader.preload(g_mainmenu, this.startGame, this);
 *
 * //load multi lists of resources
 * cc.Loader.preload([g_mainmenu,g_level], this.startGame, this);
 */
cc.Loader.preload = function (resources, selector, target) {
    if (!this._instance) {
        this._instance = new cc.Loader();
    }
    this._instance.initWithResources(resources, selector, target);
    return this._instance;
};

/**
 * Preload resources async
 * @param {Array} resources
 * @param {Function|String} selector
 * @param {Object} target
 * @return {cc.Loader}
 */
cc.Loader.preloadAsync = function (resources, selector, target) {
    if (!this._instance) {
        this._instance = new cc.Loader();
    }
    this._instance.setAsync(true);
    this._instance.initWithResources(resources, selector, target);
    return this._instance;
};

/**
 * Release the resources from a list
 * @param {Array} resources
 */
cc.Loader.purgeCachedData = function (resources) {
    if (this._instance) {
        this._instance.releaseResources(resources);
    }
};

/**
 * Returns a shared instance of the loader
 * @function
 * @return {cc.Loader}
 */
cc.Loader.getInstance = function () {
    if (!this._instance) {
        this._instance = new cc.Loader();
    }
    return this._instance;
};

cc.Loader._instance = null;


/**
 * Used to display the loading screen
 * @class
 * @extends cc.Scene
 */
cc.LoaderScene = cc.Scene.extend(/** @lends cc.LoaderScene# */{
    _logo: null,
    _logoTexture: null,
    _texture2d: null,
    _bgLayer: null,
    _label: null,
    _winSize:null,

    /**
     * Constructor
     */
    ctor: function () {
        this._super();
        this._winSize = cc.Director.getInstance().getWinSize();
    },
    init:function(){
        cc.Scene.prototype.init.call(this);

        //logo
        var logoHeight = 200;
        var centerPos = cc.p(this._winSize.width / 2, this._winSize.height / 2);

        this._logoTexture = new Image();
        var _this = this;
        this._logoTexture.addEventListener("load", function () {
            _this._initStage(centerPos);
        });
        this._logoTexture.src = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MEFCMjMwMzA1MUNCMTFFMjlBQzlFODNDMzU4QzVCRTAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OTdFRjgwMDQ1MUQyMTFFMjlBQzlFODNDMzU4QzVCRTAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDowQUIyMzAyRTUxQ0IxMUUyOUFDOUU4M0MzNThDNUJFMCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDowQUIyMzAyRjUxQ0IxMUUyOUFDOUU4M0MzNThDNUJFMCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PoG10pIAABdzSURBVHjazFoJfFTV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";
        this._logoTexture.width = 64;
        this._logoTexture.height = 64;

//        this._logoTexture.src = "data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAlAAD/4QMpaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjAtYzA2MCA2MS4xMzQ3NzcsIDIwMTAvMDIvMTItMTc6MzI6MDAgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjM4MDBEMDY2QTU1MjExRTFBQTAzQjEzMUNFNzMxRkQwIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjM4MDBEMDY1QTU1MjExRTFBQTAzQjEzMUNFNzMxRkQwIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDUzUgV2luZG93cyI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU2RTk0OEM4OERCNDExRTE5NEUyRkE3M0M3QkE1NTlEIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU2RTk0OEM5OERCNDExRTE5NEUyRkE3M0M3QkE1NTlEIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+/+4ADkFkb2JlAGTAAAAAAf/bAIQADQkJCQoJDQoKDRMMCwwTFhENDREW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";
//        this._logoTexture.width = 160;
//        this._logoTexture.height = 200;

        // bg
        this._bgLayer = cc.LayerColor.create(cc.c4(32, 32, 32, 255));
        this._bgLayer.setPosition(cc.p(0, 0));
        this.addChild(this._bgLayer, 0);

        //loading percent
        this._label = cc.LabelTTF.create("Loading... 0%", "Arial", 14);
        this._label.setColor(cc.c3(180, 180, 180));
        this._label.setOpacity(0);
        this._label.setPosition(cc.pAdd(centerPos, cc.p(0, -logoHeight / 2 - 10)));
        this._bgLayer.addChild(this._label, 10);
    },

    _initStage: function (centerPos) {
        if (cc.renderContextType === cc.CANVAS) {
            this._logo = cc.Sprite.createWithTexture(this._logoTexture);
        } else {
            this._texture2d = new cc.Texture2D();
            this._texture2d.initWithElement(this._logoTexture);
            this._texture2d.handleLoadedTexture();
            this._logo = cc.Sprite.createWithTexture(this._texture2d);
        }
        this._logo.setPosition(centerPos);
        this._bgLayer.addChild(this._logo, 10);

        //load resources
        this._logoFadeIn();
    },

    onEnter: function () {
        cc.Node.prototype.onEnter.call(this);
        this.schedule(this._startLoading, 0.3);
    },

    onExit: function () {
        cc.Node.prototype.onExit.call(this);
        var tmpStr = "Loading... 0%";
        this._label.setString(tmpStr);
    },

    /**
     * init with resources
     * @param {Array} resources
     * @param {Function|String} selector
     * @param {Object} target
     */
    initWithResources: function (resources, selector, target) {
        this.resources = resources;
        this.selector = selector;
        this.target = target;
    },

    _startLoading: function () {
        this.unschedule(this._startLoading);
        cc.Loader.preload(this.resources, this.selector, this.target);
        this.schedule(this._updatePercent);
    },

    _logoFadeIn: function () {
        var logoAction = cc.Spawn.create(
            cc.EaseBounce.create(cc.MoveBy.create(0.25, cc.p(0, 10))),
            cc.FadeIn.create(0.5));

        var labelAction = cc.Sequence.create(
            cc.DelayTime.create(0.15),
            logoAction.clone());

        this._logo.runAction(logoAction);
        this._label.runAction(labelAction);
    },

    _updatePercent: function () {
        var percent = cc.Loader.getInstance().getPercentage();
        var tmpStr = "Loading... " + percent + "%";
        this._label.setString(tmpStr);

        if (percent >= 100)
            this.unschedule(this._updatePercent);
    }
});

/**
 * Preload multi scene resources.
 * @param {Array} resources
 * @param {Function|String} selector
 * @param {Object} target
 * @return {cc.LoaderScene}
 * @example
 * //example
 * var g_mainmenu = [
 *    {src:"res/hello.png"},
 *    {src:"res/hello.plist"},
 *
 *    {src:"res/logo.png"},
 *    {src:"res/btn.png"},
 *
 *    {src:"res/boom.mp3"},
 * ]
 *
 * var g_level = [
 *    {src:"res/level01.png"},
 *    {src:"res/level02.png"},
 *    {src:"res/level03.png"}
 * ]
 *
 * //load a list of resources
 * cc.LoaderScene.preload(g_mainmenu, this.startGame, this);
 *
 * //load multi lists of resources
 * cc.LoaderScene.preload([g_mainmenu,g_level], this.startGame, this);
 */
cc.LoaderScene.preload = function (resources, selector, target) {
    if (!this._instance) {
        this._instance = new cc.LoaderScene();
        this._instance.init();
    }

    this._instance.initWithResources(resources, selector, target);

    var director = cc.Director.getInstance();
    if (director.getRunningScene()) {
        director.replaceScene(this._instance);
    } else {
        director.runWithScene(this._instance);
    }

    return this._instance;
};
