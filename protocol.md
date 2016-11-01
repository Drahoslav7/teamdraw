# IO protocol

methods without + use no callback   
methods with + might return error in callback   
methods with ++ returs objects in callback  which might contains err and more data (eg. token/secret)   

	client			server			client
		|	create		|				|
		|++------------>|				|
		|				|				|
		|	login		|				|
		|+------------->|				|
		|	users		|				|
		|<--------------|				|


		|	action		|				|
		|+------------->|				|
		|	actions		|				|
		|<--------------|				|


		|				|	join		|
		|				|<------------++|
		|				|				|
		|				|	login		|
		|				|<-------------+|
		|	users		|	users		|
		|<--------------|-------------->|
		|				|	sync		|
		|				|<--------------|
		|				|	actions		|
		|				|-------------->|


		|	cursor		|				|
		|-------------->|	cursors		|
		|				|-------------->|


		|	action		|				|
		|+------------->|				|
		|	actions		|	actions		|
		|<--------------|-------------->|


		|	acl			|				|
		|+------------->|				|
		|	users		|	users		|
		|<--------------|-------------->|




## client -> server methods


**'create'**  -> undefined <- CREATE_RESPONSE

	CREATE_RESPONSE := {
		err: ERR, // if err not null data another might be undefined or invalid
		token: TOKEN, // token of newly created instance
		secret: SECRET // secret of newly created user
	}


**'join'** -> JOIN_REQUEST <- JOIN_RESPONSE

	JOIN_REQUEST -> {
		token: TOKEN,
		secret: undefined | SECRET
	}


	JOIN_RESPONSE := {
		err: ERR, // if err not null data another might be undefined or invalid
		secret: SECRET // secret of newly created or (existing) user
	}


**'login'** -> LOGIN_REQUEST <- LOGIN_RESPONSE

	LOGIN_REQUEST := NICK


	LOGIN_RESPONSE := ERR


**'sync'** -> SYNC_REQUEST

	SYNC_REQUEST := N // last action ID


**'action'** -> ACTION_REQUEST <- ACTION_RESPONSE

	ACTION_REQUEST := {
		type: ACTION_TYPE, // same as in ACTIONS
		data: ACTION_DATA, // same as in ACTIONS
	}


	ACTION_RESPONSE := ERR


**'cursor'** -> CURSOR_REQUEST

	CURSOR_REQUEST := {
		position: POINT // position of cursor
	}


**'acl'** -> ACL_REQUEST <- ACL_RESPONSE

	ACL_REQUEST := {
		what: ACL_ACTION,
		nick: NICK,
	}

	ACL_ACTION := 'mute' | 'unmute' | 'blind' | 'unblind'


	ACL_RESPONSE := ERR

## server -> client methods

**'actions'** => ACTIONS // new user action

	ACTIONS := [ACTION, …]

	ACTION := {
		type: ACTION_TYPE,
		data: ACTION_DATA,
		n: N		// serial number of action
	}

	ACTION_TYPE := 'item' | 'erase' | 'translate' | 'textEdit'

	ACTION_DATA := ITEM_DATA | ERASE_DATA | TRANSLATION_DATA | TEXTEDIT_DATA

	ITEM_DATA := [PAPER_CLASS_NAME, PAPER_DATA] // returned by paper.Item.prototype.exportJSON({asString:false});

	TRANSLATION_DATA := {
		ns: NS, // serial numbers of objets
		delta: POINT // position difference
	}

	ERASE_DATA := NS // serial numbers of objets
	
	TEXTEDIT_DATA := {
		n: N, // serial number of object
		text: STRING // Text
	}

	PAPER_CLASS_NAME := 'Path' | 'PointText' // *String* classname of paper.js

	PAPER_DATA := // {Mixed} depends on paper.js


**'users'** => USERS // list of connected users

	USERS := [USER, …]

	USER :=	{
		nick: NICK,
		rights: {
			toSee: RIGHT,
			toDraw: RIGHT,
			toChangeRights: RIGHT
		}
	}

	RIGHT := true | false // *Booelan*


**'cursors'** => CURSORS // cursors with new position

	CURSORS := [CURSOR, …]

	CURSOR := {
		name: NICK, // correspond with nick of cursor's user
		position: POINT
	}


## Mixed

	NICK := "nick" // any *String*
	TOKEN := "ABCD2345" // base32 *String*
	SECRET := "abcdABCD123456_-" // base64 *String*

	POINT := {
		x: N,
		y: N
	}

	NS := [N,N, …]

	N :=  1 // any *Integer*
