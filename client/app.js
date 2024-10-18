// Removes the contents of the given DOM element (equivalent to elem.innerHTML = '' but faster)
function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
    let template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}
var profile = {
    username : "Alice"
}
var Service = {};
Service.origin = window.location.origin;
Service.getAllRooms = function(){
    return new Promise(((resolve, reject) => {
        let x = new XMLHttpRequest();
        x.open("GET", Service.origin + "/chat");
        x.onload = function () {
            if (x.status === 200) {
                resolve(JSON.parse(x.response));
            } else {
                let error = new Error(x.response);
                reject(error);
            }
        }
        x.onerror = function (e){
            reject(new Error(e));
        }
        x.send();
    }))

}
Service.getLastConversation = function(roomId, before){
    let url;
    if (before){
        url = Service.origin + `/chat/${roomId}/messages?before=${before}`;
    }else {
        url = Service.origin + `/chat/${roomId}/messages`;

    }
    return fetch(url).then((response)=>{
        if (response.ok){
            return response.json();
        } else{
            return response.text().then((text) => {
                throw new Error(text);
            });
        }
    });
}
Service.addRoom = function(data){
        let x = new XMLHttpRequest();
        x.open("POST", Service.origin + "/chat");
        return new Promise((resolve, reject) => {
            x.setRequestHeader("Content-Type", "application/json");
            var payload = JSON.stringify(data);
            console.log(data);
            console.log(payload);

            x.onload = function () {
                if (x.status === 200) {
                    resolve(JSON.parse(x.response));
                } else {
                    let error = new Error(x.response);
                    reject(error);
                }
            };
            x.onerror = function (e){
                reject(new Error(e));
            };
            x.send(payload);
        })
}
Service.getProfile = function(){
    let x = new XMLHttpRequest();
    x.open("GET", Service.origin + "/profile");
    return new Promise((resolve, reject) => {
        x.onload = function(){
            if (x.status === 200) {
                resolve(JSON.parse(x.response));
            } else {
                let error = new Error(x.response);
                reject(error);
            }
        };
        x.onerror = function (e){
            reject(new Error(e));
        };
        x.send();
    })
}
var LobbyView = function(lobby){
    this.lobby = lobby;
    this.elem = createDOM("<div class=\"content\">\n" +
        "          <ul class=\"room-list\">\n" +
        "            <li class=\"chat\">\n" +
        "              chat1\n" +
        "              <a href=\"#/chat\">\n" +
        "                chat1\n" +
        "              </a>\n" +
        "            </li>\n" +
        "            <li class=\"chat\">\n" +
        "              chat2\n" +
        "              <a href=\"#/chat\">\n" +
        "                chat2\n" +
        "              </a>\n" +
        "            </li>\n" +
        "            <li class=\"chat\">\n" +
        "              chat3\n" +
        "              <a href=\"#/chat\">\n" +
        "                chat3\n" +
        "              </a>\n" +
        "            </li>\n" +
        "          </ul>\n" +
        "          <div class=\"page-control\">\n" +
        "            <input type=\"text\">\n" +
        "            <button type=\"button\">\n" +
        "              Create Room\n" +
        "            </button>\n" +
        "          </div>\n" +
        "        </div>");
    this.listElem = this.elem.querySelector("ul.room-list");
    this.inputElem = this.elem.querySelector("input");
    this.buttonElem = this.elem.querySelector("button");


    this.redrawList();
    var that = this;
    this.buttonElem.addEventListener("click", function(){
        let text = that.inputElem.value;
        var data = {
            name: text,
            image: "assets/everyone-icon.png"
        }

        Service.addRoom(data).then(
            (response) => {
                that.lobby.addRoom(response._id, response.name, response.image, response.messages)
            }
        ).catch((e) => {
            console.log(e);
        })
        that.inputElem.value = "";

    });
    this.lobby.onNewRoom = function(room){
        let new_room = document.createElement("li");
        new_room.id = room.id;
        new_room.name = room.name;
        new_room.image = room.image;
        new_room.messages = room.messages;
        let link = document.createElement("a");
        let text = document.createTextNode(new_room.name);
        link.href = "#/chat" + "/" + new_room.id;
        link.appendChild(text);
        new_room.appendChild(link);
        that.listElem.appendChild(new_room);
    }
}
LobbyView.prototype.redrawList = function(){
    emptyDOM(this.listElem);

    for (let id in this.lobby.rooms){
        let room = document.createElement("li");
        room.id = id;
        room.name = this.lobby.rooms[id].name;
        room.image = this.lobby.rooms[id].image;
        room.messages = this.lobby.rooms[id].messages;
        let image = document.createElement("img");
        image.src = room.image;
        let link = document.createElement("a");
        let text = document.createTextNode(room.name);
        link.href = "#/chat" + "/" + room.id;
        link.appendChild(text);
        room.appendChild(link);
        room.appendChild(image);
        this.listElem.appendChild(room);
    }
}


var ChatView = function(socket){
    this.socket = socket;
    this.elem = createDOM("<div class=\"content\">\n" +
        "            <h4 class=\"room-name\">\n" +
        "                CPEN322\n" +
        "            </h4>\n" +
        "            <div class=\"message-list\">\n" +
        "                <div class=\"message\">\n" +
        "                    <span class=\"message-user\">\n" +

        "                    </span>\n" +
        "                    <span class=\"message-text\">\n" +

        "                    </span>\n" +
        "                </div>\n" +
        "                <div class=\"my-message\">\n" +
        "                    <span class=\"message-user\">\n" +

        "                    </span>\n" +
        "                    <span class=\"message-text\">\n" +

        "                    </span>\n" +
        "                </div>\n" +
        "            </div>\n" +
        "            <div class=\"page-control\">\n" +
        "                <textarea>\n" +
        "\n" +
        "                </textarea>\n" +
        "                <button type=\"button\">\n" +
        "                    Send\n" +
        "                </button>\n" +
        "            </div>\n" +
        "        </div>");
    this.titleElem = this.elem.querySelector("h4");
    this.chatElem = this.elem.querySelector("div.message-list");
    this.inputElem = this.elem.querySelector("textarea");
    this.buttonElem = this.elem.querySelector("button");
    this.room = null;
    var that = this
    this.buttonElem.addEventListener("click", function(){
        that.sendMessage();
    });
    this.inputElem.addEventListener("keyup", function(e){
        if (e.keyCode === 13 && !e.shiftKey) {
            that.sendMessage();
        }
    });
    this.chatElem.addEventListener("wheel", function(e){
        if (e.deltaY < 0 && that.room.canLoadConversation === true && that.chatElem.scrollTop === 0 ){
            that.room.getLastConversation.next();
        }
    })
}
ChatView.prototype.sendMessage = function(){
    let text = this.inputElem.value;
    this.room.addMessage(profile.username, text);
    this.socket.send(JSON.stringify({
        roomId: this.room.id,
        text: text
    }));
    this.inputElem.value = "";
}
ChatView.prototype.setRoom = function(room){
    this.room = room;
    emptyDOM(this.titleElem);
    let room_name = document.createTextNode(room.name);
    this.titleElem.appendChild(room_name);
    emptyDOM(this.chatElem);
    for (let i = 0; i < this.room.messages.length; i++){
        let message = document.createElement("div");
        if (this.room.messages[i].username === profile.username){
            message.className = "my-message";
        } else {
            message.className = "message";
        }
        let message_user_span = document.createElement("span");
        message_user_span.className = "message-user";
        let message_user_text = document.createTextNode(this.room.messages[i].username);
        message_user_span.appendChild(message_user_text);
        message.appendChild(message_user_span);
        let message_text_span = document.createElement("span");
        message_text_span.className = "message-text";
        let message_text_text = document.createTextNode(" " + this.room.messages[i].text + " ");
        message_text_span.appendChild(message_text_text);
        message.appendChild(message_text_span);
        this.chatElem.appendChild(message);
    }
    var that = this
    /*
    this.room.onNewMessage = function(message){
        let new_message = document.createElement("div");
        if (message.username === profile.username){
            new_message.className = "message my-message";
        } else {
            new_message.className = "message";
        }
        let message_user_span = document.createElement("span");
        message_user_span.className = "message-user";
        let message_user_text = document.createTextNode(message.username);
        message_user_span.appendChild(message_user_text);
        new_message.appendChild(message_user_span);
        let message_text_span = document.createElement("span");
        message_text_span.className = "message-text";
        let message_text_text = document.createTextNode(" " + message.text + " ");
        message_text_span.appendChild(message_text_text);
        new_message.appendChild(message_text_span);
        that.chatElem.appendChild(new_message);
        console.log(new_message);
        console.log(message_user_span);
        console.log(message_text_text);
    }
    */
    function sanitize(string) {
        const map = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            "/": '&#x2F;',
        };
        const reg = /[<>"'/]/ig;
        return string.replace(reg, (match)=>(map[match]));
    }
    this.room.onNewMessage=(message)=>{
        let messageClass;
        if(message.username===profile.username){
            messageClass="my-message";
        } else {
            messageClass = "";
        }

        this.chatElem.appendChild(createDOM(
            ` <div class="message ${messageClass}">
                                <span class="message-user"><b>${message.username}</b></span><br/>
                                <span class="message-text">${sanitize(message.text)}</span>
                            </div>` ));
        //console.log(this.chatElem);
       // console.log(this.chatElem.firstChild);
       // console.log(this.chatElem.firstChild.firstChild);
    };
    this.room.onFetchConversation = function (conversation) {
        let hb = that.chatElem.scrollHeight;
        let children=[];

        for (let i = 0; i < conversation.messages.length; i++) {
            let message = conversation.messages[i];
            let myMessageClass = "";
            if(message['username'] === profile.username){
                myMessageClass = "my-message";
            } else {
                myMessageClass = "message";
            }

            children.push(createDOM(
                `<div class="message ${myMessageClass}">
                <span class="message-user"><b>${message['username']}</b></span><br/>
                <span class="message-text">${message['text']}</span>
            </div>`)) ;

        }
        that.chatElem.prepend(...children);
        let ha = that.chatElem.scrollHeight;
        that.chatElem.scrollTop = ha - hb;
    }
}


var ProfileView = function(){
    this.elem = createDOM("<div class=\"content\">\n" +
        "            <div class=\"profile-form\">\n" +
        "                <div class=\"form-field\">\n" +
        "                    <label>\n" +
        "                        Username\n" +
        "                    </label>\n" +
        "                    <input type=\"text\">\n" +
        "                </div>\n" +
        "                <div class=\"form-field\">\n" +
        "                    <label>\n" +
        "                        Password\n" +
        "                    </label>\n" +
        "                    <input type=\"password\">\n" +
        "                </div>\n" +
        "                <div class=\"form-field\">\n" +
        "                    <label>\n" +
        "                        Avatar Image\n" +
        "                    </label>\n" +
        "                    <input type=\"file\">\n" +
        "                </div>\n" +
        "                <div class=\"form-field\">\n" +
        "                    <label>\n" +
        "                        About\n" +
        "                    </label>\n" +
        "                    <textarea>\n" +
        "\n" +
        "                    </textarea>\n" +
        "                </div>\n" +
        "            </div>\n" +
        "            <div class=\"page-control\">\n" +
        "                <button type=\"button\">\n" +
        "                    Save\n" +
        "                </button>\n" +
        "            </div>\n" +
        "        </div>");
}

var Room = function(id, name, image = "assets/everyone-icon.png", messages = []){
    this.id = id;
    this.name = name;
    this.image = image;
    this.messages = messages;
    this.getLastConversation = makeConversationLoader(this);
    this.canLoadConversation = true;
    this.time = Date.now();
}


Room.prototype.addMessage = function(username, text){
    if (text.trim().length === 0){
        return
    }
    var message = {
        username: username,
        text: text
    };
    this.messages.push(message);
    if (this.onNewMessage){
        this.onNewMessage(message);
    }
}

Room.prototype.addConversation = function(conversation){
    this.messages.unshift(...conversation.messages)

    if( this.onFetchConversation){
        this.onFetchConversation(conversation)
    }
}

function* makeConversationLoader(room) {
    var lastTimeStamp = room.time;
    while (room.canLoadConversation){
        room.canLoadConversation=false;
        yield Service.getLastConversation(room.id,lastTimeStamp).then((conversation)=>{
            if (conversation!=null){
                lastTimeStamp = conversation.timestamp;
                room.addConversation(conversation);
                room.canLoadConversation=true;
                return conversation;
            }else {
                room.canLoadConversation=false;
                return null;
            }
        })
    }
}

var Lobby = function () {
    this.rooms = {};
}
Lobby.prototype.getRoom = function(roomId){
    for (let id in this.rooms){

        if (id === roomId){

            return this.rooms[id];
        }
    }
    return null;
}
Lobby.prototype.addRoom = function(id, name, image, messages){
    let newRoom = new Room(id, name, image, messages);
    this.rooms[id] = newRoom;
    if (this.onNewRoom){
        this.onNewRoom(newRoom);
    }
}
let main = function(){
    Service.getProfile().then((res) => {
        profile.username = res.username;
    })
    let socket = new WebSocket("ws://localhost:8000");
    socket.addEventListener("message", (message) => {
        let msg = JSON.parse(message.data);
        let room = lobby.getRoom(msg.roomId);
        if (room){
            room.addMessage(msg.username, msg.text)
        }
    })
    let lobby = new Lobby();
    let lobbyView = new LobbyView(lobby);
    let chatView = new ChatView(socket);
    let profileView = new ProfileView();
    let refreshLobby = function() {
        let response = Service.getAllRooms();
        response.then((rooms) => {
            for (let room of rooms) {
                if (lobby.rooms[room._id]) {
                    lobby.rooms[room._id].name = room.name;
                    lobby.rooms[room._id].image = room.image;
                } else {
                    lobby.addRoom(room._id, room.name, room.image, room.messages);
                }
            }
        }).catch((e) => {
            console.log(e);
        });
    }
    let renderRoute = function(){
        let routes = window.location.hash.split('/');
        let route = routes[1];

        emptyDOM(document.getElementById("page-view"));
        if (route === ""){
            document.getElementById("page-view").appendChild(lobbyView.elem);
        } else if (route === "chat") {
            let current_room = lobby.getRoom(routes[2]);
            if(current_room){
                chatView.setRoom(current_room);
            }
            document.getElementById("page-view").appendChild(chatView.elem);
        } else if (route === "profile"){
            document.getElementById("page-view").appendChild(profileView.elem);
        } else {
            
        }
    }
    refreshLobby();
    setInterval(refreshLobby, 10000);
    renderRoute();
    window.addEventListener("popstate", renderRoute);
    cpen322.export(arguments.callee, {
        renderRoute: renderRoute,
        lobbyView: lobbyView,
        chatView: chatView,
        profileView: profileView,
        lobby: lobby,
        refreshLobby: refreshLobby,
        socket: socket
    });
}
window.addEventListener("load", main) ;


