import plugin from "../plugin.json";
let AppSettings = acode.require("settings");

class AcodePlugin {
	constructor() {
		this.name_language_type = "js|ts|javascript|typescript|jsx|tsx";
		this.languageserver = "typescript-language-server";
		this.standart_args = ["--stdio"];
		this.initializeOptions = {};

		//this.Ace_Options = {};
	}

	async init() {
		let acodeLanguageClient = acode.require("acode-language-client");
		if (acodeLanguageClient) {
			await this.setupLanguageClient(acodeLanguageClient);
		} else {
			window.addEventListener("plugin.install", ({ detail }) => {
				if (detail.name === "acode-language-client") {
					acodeLanguageClient = acode.require("acode-language-client");
					this.setupLanguageClient(acodeLanguageClient);
				}
			});
		}
	}
	get settings() {
		// UPDATE SETTING SAAT RESTART ACODE
		if (!window.acode) return this.defaultSettings;
		let value = AppSettings.value[plugin.id];
		if (!value) {
			//Menjadikan Method defaultSettings sebagai nilai Default
			value = AppSettings.value[plugin.id] = this.defaultSettings;
			AppSettings.update();
		}
		return value;
	}
	get settingsMenuLayout() {
		return {
			list: [
				{
					index: 0,
					key: "serverPath",
					promptType: "text",
					prompt: "Change the serverPath before running.",
					text: "Language Executable File Path",
					value: this.settings.serverPath,
				},
				{
					index: 1,
					key: "arguments",
					promptType: "text",
					info: "For multiple arguments, please use comma ','<br>Example: --stdio, -v, -vv",
					prompt: "Argument Of Language Server",
					text: "Language Argument",
					value: this.settings.arguments.join(", "),
				},
				{
					index: 2,
					key: "typefile",
					promptType: "text",
					prompt: "Type File of Language",
					text: "Language Argument",
					value: this.settings.typefile,
				},
			],

			cb: (key, value) => {
				switch (key) {
					case "arguments":
						value = value ? value.split(",").map((item) => item.trim()) : [];
						break;
				}
				AppSettings.value[plugin.id][key] = value;
				AppSettings.update();
			},
		};
	}

	get defaultSettings() {
		return {
			typefile: this.name_language_type,
			serverPath: this.languageserver,
			arguments: this.standart_args,
			//Ace_Options: this.Ace_Options,
			languageClientConfig: this.initializeOptions,
		};
	}
	async setupLanguageClient(acodeLanguageClient) {
		// Dapatkan WebSocket untuk server LSP
		let socket = acodeLanguageClient.getSocketForCommand(
			this.settings.serverPath, // Path ke LemMinX JAR
			this.settings.arguments, // Argumen untuk menjalankan LemMinX
		);
		let languageClient = new acodeLanguageClient.LanguageClient({
			type: "socket",
			socket,
			initializationOptions: this.settings.languageClientConfig.initializationOptions,
		});
		
		languageClient.sendInitialize(this.settings.languageClientConfig.initializationOptions);
		
		// Daftarkan layanan
		acodeLanguageClient.registerService(this.settings.typefile, languageClient);

		// Daftarkan formatter
		acode.registerFormatter(plugin.name, this.name_language_type.split("|"), () => {
			acodeLanguageClient.format();
		});
	}

	async destroy() {
		if (AppSettings.value[plugin.id]) {
			delete AppSettings.value[plugin.id];
			AppSettings.update();
		}
	}
}

if (window.acode) {
	const acodePlugin = new AcodePlugin();
	acode.setPluginInit(
		plugin.id,
		async (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
			if (!baseUrl.endsWith("/")) {
				baseUrl += "/";
			}
			acodePlugin.baseUrl = baseUrl;
			await acodePlugin.init($page, cacheFile, cacheFileUrl);
		},
		acodePlugin.settingsMenuLayout,
	);

	acode.setPluginUnmount(plugin.id, () => {
		acodePlugin.destroy();
	});
}
