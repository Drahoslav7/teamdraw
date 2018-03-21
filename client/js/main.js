/* ========== MAIN ========== */

$(function() {

	const console = new Logger("main")

	const tokenerrormodal = $("#tokenerrormodal")
	const neterrormodal = $("#neterrormodal")
	const helpmodal = $("#helpmodal")


	// init

	if (location.hash === "" || location.hash === "#") {
		app.create(function(err) {
			// TODO err
			console.error(err)
			$("#signmodal").modal("show")
		})
	} else {
		app.join(function(err, firstTime) {
			// TODO err
			if (err) {
				tokenerrormodal.modal("show")
			}
			console.error(err)
			if (firstTime || !app.getNick()) {
				$("#signmodal").modal("show")
			} else { // already loggged in
				app.login(app.getNick(), function(err) {
					// TODO err
					console.error(err)
				})
			}
		})
	}

	/* app events */

	app.on("userlist update", (users) => {
		let userList = $("#userlist")

		console.log("Userlist update", users)

		$("#online-count").html(users.length)
		$("[title]", userList).tooltip("destroy")
		userList.empty()

		let me = users.find((user) => {
			return user.nick === app.getNick()
		})

		users.forEach((user) => {
			userList.append(gui.createUserElement(user, me))
		})
		gui.userListResize(true)
	})

	app.on("disconnected", () => {
		neterrormodal.modal("show")
	})

	app.on("connected", () => {
		app.sync()
		neterrormodal.modal("hide")

		$("#alert").fadeIn("fast")
		setTimeout(() => {
			$("#alert").fadeOut("slow")
		}, 2000)
	})



	/* buttons events */

	$("#share-button").click(() => {
		$("#sharemodal").modal("show")
		$("#share-button").removeClass("btn-warning-c")
	})
	$("#help-button").click(() => {
		helpmodal.modal("show")
	})
	$("#new-button").click(() => {
		window.open(location.toString().split("#")[0])
	})
	$("#save-button, #save-button-neterror").click(() => {
		$("#savemodal").modal("show")
	})
	$('#savemodal .save-file').click(() => {
		console.log('click')
		let fileType = $(this).attr('data-type')
		draw.getBlob(fileType, (blob) => {
			let time = (new Date()).toISOString().split('.')[0]
			saveAs(blob, `teamdraw.${time}.${fileType}`)
			$("#savemodal").modal("hide")
		})
	})


	/* modals on show events */

	$("#signmodal").on("shown.bs.modal", () => {
		console.log("sign modal")
		$("#nick").focus()
		$("#nick").val(localStorage["nick"] || "")
		$("#signmodal form").submit((event) => {
			event.preventDefault()
			let nick = $("#signmodal #nick").val()
			app.login(nick, (err) => {
				console.error(err)
				if (err === null) {
					console.log("nick ok")
					$("#signmodal").modal("hide")
					if (!localStorage.firstRun) {
						$("#helpmodal").modal("show")
						localStorage.firstRun = ""
					}
				} else {
					$("#nickgroup").addClass("has-error")
					$("#nick").val("")
					$("#nick").attr("placeholder", err)
					console.log("Invalid Nick")
				}
			})
		})
	})

	$("#sharemodal").on("shown.bs.modal", () => {
		console.log("share modal")
		let link = location.toString().split("#")[0] + "#" + app.getToken()
		$("#sharemodal #link").val(link)
		$("#sharemodal #link").select()
		$("#sharemodal .btn-primary").click(() => {
			$("#sharemodal").modal("hide")
		})
	})


	$(".btn-primary", helpmodal).click(() => {
		helpmodal.modal("hide")
	})

	$(".btn-primary", tokenerrormodal).click(() => {
		location = location.pathname
	})


	/* toolbar */

	$(".btn-tool[data-tool]").click(() => {
		draw.changeToolTo($(this).attr("data-tool"))
	})


	/* other events */

	app.on("logged on", () => {

		$("#share-button").addClass("btn-warning-c")

		app.sync()

		draw.changeToolTo("pencil")

		draw.setColor("#333")
		draw.setSize(2)


		window.onbeforeunload = () => {
			app.save()
		}

		// key bindings
		$(window).keydown((event) => {
			if (draw.getCurrentToolName() !== "text" && draw.getCurrentToolName() !== "textEdit") {
				switch(event.keyCode) {
					case KeyCode.KEY_S:
						draw.changeToolTo("selector")
						break
					case KeyCode.KEY_P:
						draw.changeToolTo("pencil")
						break
					case KeyCode.KEY_B:
						draw.changeToolTo("brush")
						break
					case KeyCode.KEY_E:
						draw.changeToolTo("eraser")
						break
					case KeyCode.KEY_M:
						draw.changeToolTo("move")
						break
					case KeyCode.KEY_C:
						switch (draw.getCurrentToolName()) {
							case 'bucket':
								draw.changeToolTo("eyedropper")
								break
							case 'eyedropper':
								draw.changeToolTo("bucket")
								break
							default:
								draw.changeToolTo(["bucket", "eyedropper"][Math.floor(Math.random()*2)])
						}
						break
					case KeyCode.KEY_L:
						draw.changeToolTo("line")
						break
					case KeyCode.KEY_A:
						draw.changeToolTo("arrow")
						break
					case KeyCode.KEY_O:
						draw.changeToolTo("oval")
						break
					case KeyCode.KEY_H:
						draw.changeToolTo("heart")
						break
					case KeyCode.KEY_R:
						draw.changeToolTo("rectangle")
						break
					case KeyCode.KEY_T:
						draw.changeToolTo("text")
						event.preventDefault()
						break

					case KeyCode.KEY_DELETE:
						draw.deleteSelected()
						break
					case KeyCode.KEY_ESCAPE:
						draw.unselectAll()
						break

					case KeyCode.KEY_TAB:
						// todo hide all gui
						event.preventDefault()
						break

					case KeyCode.KEY_LEFT:
						draw.moveSelected("left")
						break
					case KeyCode.KEY_UP:
						draw.moveSelected("up")
						break
					case KeyCode.KEY_RIGHT:
						draw.moveSelected("right")
						break
					case KeyCode.KEY_DOWN:
						draw.moveSelected("down")
						break

					case KeyCode.KEY_PAGE_UP:
						draw.zoom(+1)
						break
					case KeyCode.KEY_PAGE_DOWN:
						draw.zoom(-1)
						break
				}
			} else {
				if (event.keyCode === KeyCode.KEY_ESCAPE) {
					draw.changeToolTo("selector")
				}
			}
		})

		// wheel scroll
		$(window).on("mousewheel", (e) => {
			draw.zoom(e.deltaY, {x: e.clientX, y: e.clientY})
		})

		toggleToolWhileHoldingKey("move", KeyCode.KEY_SPACE, ["text"])
		toggleToolWhileHoldingKey("eyedropper", KeyCode.KEY_ALT, ["text", "selector", "move", "eraser"])

		toggleToolWhileHoldingMouseButton("move", Button.RIGHT)


		function toggleToolWhileHoldingKey (toolname, keyCode, exceptions) {
			let prevToolName = ""
			let pressed = false
			$(window).keydown((event) => {
				if (_.includes(exceptions.concat(toolname), draw.getCurrentToolName())) {
						return
					}
				if (event.keyCode === keyCode && !pressed) {
					event.preventDefault()
					pressed = true
					prevToolName = draw.getCurrentToolName()
					draw.changeToolTo(toolname)
				}
			})
			$(window).keyup((event) => {
				if (event.keyCode === keyCode && pressed) {
					if (toolname !== draw.getCurrentToolName()) {
						return
					}
					event.preventDefault() // prevent spacebar to select outlined tool
					draw.changeToolTo(prevToolName)
					pressed = false
				}
			})
		}

		function toggleToolWhileHoldingMouseButton (toolname, button) {
			let prevToolName = ""
			$('body').on("mousedown", (event) => {
				// console.log("body mousedown")
			})
			$('#canvas').mousedown((event) => {
				// console.log("down", event.which)
				if (event.which === button) {
					prevToolName = draw.getCurrentToolName()
					draw.changeToolTo(toolname)
				}
			})
			$('#canvas').mouseup((event) => {
				// console.log("up", event.which)
				if (event.which === button) {
					draw.changeToolTo(prevToolName)
				}
			})
		}

		$('#workarea').contextmenu((event) => {
			event.preventDefault()
		})

	}) // on logged on


})
