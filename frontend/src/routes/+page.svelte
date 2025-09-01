<script>
	import { onMount } from 'svelte';
	import MetricsDisplay from '$lib/components/MetricsDisplay.svelte';
	import BusinessSelector from '$lib/components/BusinessSelector.svelte';

	let messages = [];
	let newMessage = '';
	let customerId = 'cliente_demo';
	let selectedBusinessId = '6852153db671984b247ca2b2'; // Florería Vendex por defecto
	let isLoading = false;
	let chatContainer;
	let showSuccessBanner = false;

	// API Base URL - usa backend local en dev y mismo origen en prod
	const API_BASE = typeof window !== 'undefined'
		? (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin)
		: '';

	async function sendMessage() {
		if (!newMessage.trim() || isLoading) return;

		const userMessage = newMessage.trim();
		newMessage = '';
		isLoading = true;

		// Agregar mensaje del usuario
		messages = [...messages, {
			id: Date.now(),
			type: 'user',
			content: userMessage,
			timestamp: new Date()
		}];

		scrollToBottom();

		try {
			const response = await fetch(`${API_BASE}/api/chat/message`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					businessId: selectedBusinessId,
					customerId,
					message: userMessage,
					channel: 'web'
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			const rawMsg = data?.data?.message ?? 'Respuesta recibida';
			const { display, internal } = extractInternalAnalysis(rawMsg);

			// Agregar respuesta del asistente (mostramos solo display; guardamos raw e internal)
			messages = [...messages, {
				id: Date.now() + 1,
				type: 'assistant',
				content: display,
				raw: rawMsg,
				internalAnalysis: internal,
				timestamp: new Date(),
				metrics: data?.data?.metadata,
				productImages: data?.data?.productImages || []
			}];

			// Mostrar banner de éxito
			showSuccessBanner = true;
			setTimeout(() => {
				showSuccessBanner = false;
			}, 3000);

			scrollToBottom();

		} catch (error) {
			console.error('Error sending message:', error);
			messages = [...messages, {
				id: Date.now() + 1,
				type: 'error',
				content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
				timestamp: new Date()
			}];
		} finally {
			isLoading = false;
		}
	}

	function handleKeyPress(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 100);
	}

	// Extrae el bloque de "ANÁLISIS INTERNO" del texto final
	// Retorna la parte visible (display) y la parte interna (internal)
	function extractInternalAnalysis(text) {
		if (!text) return { display: '', internal: '' };
		const pattern = /(AN[ÁA]LISIS\s+INTERNO:?[\s\S]*)$/i;
		const match = text.match(pattern);
		if (match) {
			const start = match.index ?? text.indexOf(match[0]);
			return {
				display: text.slice(0, start).trimEnd(),
				internal: text.slice(start)
			};
		}
		return { display: text, internal: '' };
	}

	function formatTime(timestamp) {
		return new Date(timestamp).toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function setExampleMessage(message) {
		newMessage = message;
	}
	
	function handleBusinessChange(event) {
		selectedBusinessId = event.detail.businessId;
		// Limpiar conversación al cambiar de negocio
		messages = [];
		onMount();
	}

	onMount(() => {
		// Mensaje de bienvenida inicial
		const businessName = selectedBusinessId === '6852153db671984b247ca2b2' ? 'Florería Vendex' : 
							selectedBusinessId === 'tech_store_001' ? 'TechStore' : 'nuestro negocio';
		
		const businessDescription = selectedBusinessId === '6852153db671984b247ca2b2' ? 
			'flores, arreglos florales y regalos especiales' :
			selectedBusinessId === 'tech_store_001' ? 
			'laptops, monitores y accesorios de alta calidad' : 
			'nuestros productos';
		
		messages = [{
			id: 1,
			type: 'assistant',
			content: `¡Hola! Soy Alex, tu asistente de ventas de ${businessName}. Estoy aquí para ayudarte a encontrar exactamente lo que necesitas. ¿En qué puedo ayudarte hoy? 😊`,
			timestamp: new Date()
		}, {
			id: 2,
			type: 'assistant',
			content: `¡Hola! Soy tu asistente virtual de ventas. Gracias por contactarme. 😊

ESTADO ACTUAL:
- Lead Score: 5/100 (nuevo contacto)
- Etapa: Initial Contact
- Probabilidad de conversión: 10%
- Nivel de urgencia: Por determinar

Estoy aquí para ayudarte con:
- Información sobre nuestros productos
- Responder tus dudas
- Encontrar lo que mejor se ajuste a tus necesidades

Tenemos ${businessDescription}. ¿Hay algo específico que te interese conocer?`,
			timestamp: new Date(),
			metrics: {
				leadScore: 100,
				conversionProbability: 100,
				sentiment: 'neutral'
			}
		}];
	});
</script>

<svelte:head>
	<title>Asistente de Ventas Inteligente - Vendex AI</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
	<!-- Header del chat -->
	<div class="text-center mb-6">
		<h1 class="text-2xl font-bold text-gray-900 mb-2">Asistente de ventas inteligente</h1>
	</div>

	<!-- Selector de negocios -->
	<BusinessSelector 
		{selectedBusinessId} 
		on:change={handleBusinessChange}
	/>

	<!-- Banner de éxito -->
	{#if showSuccessBanner}
		<div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-center">
			<span class="text-green-800 text-sm font-medium">✅ Mensaje enviado correctamente</span>
		</div>
	{/if}

	<!-- Configuración del cliente -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
		<div class="flex items-center space-x-3">
			<label for="customer-id" class="text-sm font-medium text-gray-700">ID Cliente:</label>
			<input 
				bind:value={customerId} 
				id="customer-id"
				class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				placeholder="cliente_demo"
			/>
			<div class="flex items-center space-x-2">
				<div class="w-2 h-2 bg-green-400 rounded-full"></div>
				<span class="text-xs text-gray-500">En línea</span>
			</div>
		</div>
	</div>

	<!-- Ejemplos para probar -->
	<div class="mb-4">
		<h3 class="text-sm font-medium text-gray-700 mb-3">Ejemplos para probar:</h3>
		<div class="flex flex-wrap gap-2">
			{#if selectedBusinessId === '6852153db671984b247ca2b2'}
				<!-- Ejemplos para florería -->
				<button 
					on:click={() => setExampleMessage('Buscar flores')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					🌸 Buscar flores
				</button>
				<button 
					on:click={() => setExampleMessage('Arreglo para cumpleaños')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					🎂 Cumpleaños
				</button>
				<button 
					on:click={() => setExampleMessage('Ramos de rosas')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					🌹 Ramos de rosas
				</button>
				<button 
					on:click={() => setExampleMessage('Entrega a domicilio')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					🚚 Entrega
				</button>
				<button 
					on:click={() => setExampleMessage('Precios de arreglos')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					💰 Precios
				</button>
			{:else if selectedBusinessId === 'tech_store_001'}
				<!-- Ejemplos para tienda de tecnología -->
				<button 
					on:click={() => setExampleMessage('Buscar laptop')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					💻 Buscar laptop
				</button>
				<button 
					on:click={() => setExampleMessage('Monitores gaming')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					🖥️ Monitores
				</button>
				<button 
					on:click={() => setExampleMessage('Accesorios para computadora')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					⌨️ Accesorios
				</button>
				<button 
					on:click={() => setExampleMessage('Especificaciones técnicas')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					⚙️ Especificaciones
				</button>
				<button 
					on:click={() => setExampleMessage('Garantía y soporte')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					🛡️ Garantía
				</button>
			{:else}
				<!-- Ejemplos genéricos -->
				<button 
					on:click={() => setExampleMessage('Buscar productos')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					🛍️ Buscar productos
				</button>
				<button 
					on:click={() => setExampleMessage('Preguntar precio')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					💰 Preguntar precio
				</button>
				<button 
					on:click={() => setExampleMessage('Información del producto')}
					class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					ℹ️ Información
				</button>
			{/if}
		</div>
	</div>

	<!-- Chat container -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
		<!-- Messages -->
		<div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 space-y-4">
			{#each messages as message (message.id)}
				<div class="flex {message.type === 'user' ? 'justify-end' : 'justify-start'}">
					<div class="max-w-xs lg:max-w-md">
						<!-- Mensaje -->
						<div class="{
							message.type === 'user' 
								? 'bg-blue-500 text-white' 
								: message.type === 'error'
									? 'bg-red-50 text-red-800 border border-red-200'
									: 'bg-gray-100 text-gray-900'
						} rounded-2xl px-4 py-3 shadow-sm">
							{#if message.type === 'assistant'}
								<div class="flex items-center mb-2">
									<div class="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
										<span class="text-white text-xs font-bold">AI</span>
									</div>
									<span class="text-xs font-medium text-gray-600">Asistente</span>
								</div>
							{/if}
							
							<p class="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
							
							<!-- Imágenes de productos mencionados -->
							{#if message.productImages && message.productImages.length > 0}
								<div class="mt-3 space-y-2">
									{#each message.productImages as product}
										<div class="bg-white rounded-lg border border-gray-200 p-3">
											<div class="flex items-center space-x-3">
												<img 
													src={product.imageUrl} 
													alt={product.productName}
													class="w-16 h-16 object-cover rounded-lg"
													on:error={(e) => e.target.style.display = 'none'}
												/>
												<div class="flex-1">
													<h4 class="font-medium text-sm text-gray-900">{product.productName}</h4>
													<p class="text-sm text-gray-600">${product.price} {product.currency}</p>
													<a 
														href={product.imageUrl} 
														target="_blank" 
														rel="noopener noreferrer" 
														class="text-xs text-blue-500 hover:underline"
													>
														Ver imagen
													</a>
													{#if product.imageCount > 1}
														<p class="text-xs text-gray-500">{product.imageCount} imágenes disponibles</p>
													{/if}
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
							
							<div class="mt-2 text-xs opacity-70">
								{formatTime(message.timestamp)}
							</div>
						</div>

						<!-- Métricas (solo para mensajes del asistente) -->
						{#if message.metrics && message.type === 'assistant'}
							<div class="mt-3">
								<MetricsDisplay metrics={message.metrics} />
							</div>
						{/if}
					</div>
				</div>
			{/each}
			
			{#if isLoading}
				<div class="flex justify-start">
					<div class="flex items-center space-x-2 text-gray-500 bg-gray-100 rounded-2xl px-4 py-3">
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
						<span class="text-sm">Escribiendo...</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Input area -->
		<div class="border-t border-gray-200 p-4">
			<!-- Input -->
			<div class="flex space-x-3">
				<div class="flex-1 flex items-center space-x-2">
					<span class="text-xs text-gray-500 font-medium">{customerId}</span>
					<textarea
						bind:value={newMessage}
						on:keypress={handleKeyPress}
						placeholder="Escribe tu mensaje aquí..."
						class="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
						rows="2"
						disabled={isLoading}
					></textarea>
				</div>
				<button
					on:click={sendMessage}
					disabled={isLoading || !newMessage.trim()}
					class="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[80px]"
				>
					{#if isLoading}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
					{:else}
						<span class="text-sm font-medium">Enviar</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>