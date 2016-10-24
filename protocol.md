# IO protocol

methods without + use no callback  
methods with + might return error in callback  
methods with ++ returs objects in callback  which might contains err and more data (eg. token/secret)  

	client			server			client
		|	create		|				|
		|++------------>|				|
		|				|				|
		|	login		|				|
		|++------------>|				|
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
		|				|<------------++|
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


		|				|				|
		|				|				|
		|				|				|





## client -> server methods

**'create'** // empty

**create_callback** -> CREATE_CALLBACK

	CREATE_CALLBACK := {
		err: ERR, // if err not null data another might be undefined or invalid
		token: TOKEN, // token of newly created instance
		secret: SECRET // secret of newly created user
	}

**'join'** -> JOIN_REQUEST

	JOIN_REQUEST -> {
		token: TOKEN,
		secret: undefined | SECRET
	}

**join_callback** <- JOIN_CALLBACK

	JOIN_CALLBACK := {
		err: ERR, // if err not null data another might be undefined or invalid
		secret: SECRET // secret of newly created or (existing) user
	}


## server -> client methods

**'actions'** => ACTIONS // nová akce uživatele

	ACTIONS := [ACTION, …]

	ACTION := {
		type: TYPE,	// typ akce
		data: DATA,	// data akce
		n: N		// pořadové číslo akce
	}

	TYPE := 'item' | 'erase' | 'translate'

	DATA := ITEM_DATA | ERASE_DATA | TRANSLATION_DATA

	ITEM_DATA := [PAPER_CLASS_NAME, PAPER_DATA] // To co vrací paper.Item.prototype.exportJSON({asString:false});

	TRANSLATION_DATA := {
		ns: NS, // čisla objektů
		delta: POINT // rozdíl změny pozice
	}

	ERASE_DATA := NS // čísla objektů

	PAPER_CLASS_NAME := 'Path' | 'PointText' // *String* třída paper.js

	PAPER_DATA := // {Mixed}


**'users'** => USERS // seznam připojených uživatelů

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


**'cursors'** => CURSORS // kurzory s novou pozicí

	CURSORS := [CURSOR, …]

	CURSOR := {
		name: NICK, // odpovídá nicku uživatele kurzoru
		position: POINT
	}


*-*

	NICK := "nick" // any *String*

	POINT := {
		x: N,
		y: N
	}

	NS := [N,N, …]

	N :=  1 // any *Integer*
