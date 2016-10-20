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


		|	action		|				|
		|+------------->|				|


		|				|	join		|
		|				|<------------++|
		|				|				|
		|				|	login		|
		|	users		|<------------++|
		|<--------------|				|
		|				|	sync		|
		|				|<--------------|
		|				|	actions		|
		|				|-------------->|


		|	cursor		|				|
		|-------------->|	cursors		|
		|				|-------------->|
		

		|	action		|				|
		|+------------->|	actions		|
		|				|-------------->|


		|				|				|
		|				|				|
		|				|				|





## client -> server methods

	// todo

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
