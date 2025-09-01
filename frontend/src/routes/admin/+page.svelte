<script>
	import { onMount } from 'svelte';

	let selectedFile = null;
	let isUploading = false;
	let uploadResult = null;
	let trainingHistory = [];
	let isLoadingHistory = true;

	function handleFileSelect(event) {
		selectedFile = event.target.files[0];
		uploadResult = null;
	}

	function handleDrop(event) {
		event.preventDefault();
		selectedFile = event.dataTransfer.files[0];
		uploadResult = null;
	}

	function handleDragOver(event) {
		event.preventDefault();
	}

	async function uploadConversation() {
		if (!selectedFile) return;

		isUploading = true;
		uploadResult = null;

		try {
			// Simular procesamiento (en producción conectar con el backend)
			await new Promise(resolve => setTimeout(resolve, 2000));

			uploadResult = {
				success: true,
				message: 'Conversación analizada exitosamente',
				insights: {
					totalMessages: Math.floor(Math.random() * 50) + 10,
					successfulTechniques: [
						'Confirmación inmediata de disponibilidad',
						'Múltiples opciones de pago',
						'Flexibilidad con fechas',
						'Educación del cliente'
					].slice(0, Math.floor(Math.random() * 3) + 2),
					conversionRate: Math.floor(Math.random() * 40) + 60,
					leadScore: Math.floor(Math.random() * 30) + 70
				}
			};

			// Agregar a historial
			trainingHistory = [{
				id: Date.now(),
				filename: selectedFile.name,
				uploadDate: new Date(),
				status: 'processed',
				insights: uploadResult.insights
			}, ...trainingHistory];

			// Limpiar selección
			selectedFile = null;
			if (document.getElementById('file-input')) {
				document.getElementById('file-input').value = '';
			}

		} catch (error) {
			console.error('Error uploading conversation:', error);
			uploadResult = {
				success: false,
				message: 'Error al procesar la conversación'
			};
		} finally {
			isUploading = false;
		}
	}

	onMount(() => {
		// Simular carga de historial
		setTimeout(() => {
			trainingHistory = [
				{
					id: 1,
					filename: 'conversacion_flores_exitosa.txt',
					uploadDate: new Date(Date.now() - 86400000),
					status: 'processed',
					insights: {
						totalMessages: 24,
						successfulTechniques: ['Flexibilidad extrema', 'Educación del cliente'],
						conversionRate: 95,
						leadScore: 85
					}
				},
				{
					id: 2,
					filename: 'chat_laptop_gaming.txt',
					uploadDate: new Date(Date.now() - 172800000),
					status: 'processed',
					insights: {
						totalMessages: 18,
						successfulTechniques: ['Especificaciones técnicas', 'Comparación de productos'],
						conversionRate: 78,
						leadScore: 72
					}
				}
			];
			isLoadingHistory = false;
		}, 1000);
	});
</script>

<svelte:head>
	<title>Admin - Vendex AI</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Panel de Entrenamiento</h1>
		<p class="text-gray-600 mt-1">Entrena al asistente con conversaciones exitosas</p>
	</div>

	<!-- Subida de archivos -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
		<h2 class="text-xl font-semibold text-gray-900 mb-6">📁 Subir Nueva Conversación</h2>
		
		<!-- Zona de drop -->
		<div 
			class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
			on:drop={handleDrop}
			on:dragover={handleDragOver}
			on:click={() => document.getElementById('file-input')?.click()}
		>
			{#if selectedFile}
				<div class="space-y-3">
					<div class="text-4xl">📄</div>
					<p class="text-lg font-medium text-gray-900">{selectedFile.name}</p>
					<p class="text-sm text-gray-600">{(selectedFile.size / 1024).toFixed(1)} KB</p>
					<button 
						on:click|stopPropagation={() => { 
							selectedFile = null; 
							document.getElementById('file-input').value = ''; 
						}}
						class="text-red-600 hover:text-red-800 text-sm font-medium"
					>
						❌ Remover archivo
					</button>
				</div>
			{:else}
				<div class="space-y-3">
					<div class="text-4xl">📤</div>
					<p class="text-lg font-medium text-gray-900">Arrastra tu archivo aquí</p>
					<p class="text-sm text-gray-600">o haz click para seleccionar</p>
					<p class="text-xs text-gray-500">Formatos: .txt, .csv, WhatsApp exports</p>
				</div>
			{/if}
			
			<input 
				id="file-input"
				type="file" 
				accept=".txt,.csv"
				on:change={handleFileSelect}
				class="hidden"
			/>
		</div>

		<!-- Botón de subida -->
		{#if selectedFile}
			<div class="mt-6 flex justify-center">
				<button 
					on:click={uploadConversation}
					disabled={isUploading}
					class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
				>
					{#if isUploading}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
						<span>Analizando conversación...</span>
					{:else}
						<span>🧠</span>
						<span>Analizar y Entrenar</span>
					{/if}
				</button>
			</div>
		{/if}

		<!-- Resultado de subida -->
		{#if uploadResult}
			<div class="mt-6 p-4 rounded-lg {
				uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
			}">
				<div class="flex items-start">
					<span class="{uploadResult.success ? 'text-green-600' : 'text-red-600'} mr-2">
						{uploadResult.success ? '✅' : '❌'}
					</span>
					<div class="flex-1">
						<p class="font-medium {uploadResult.success ? 'text-green-800' : 'text-red-800'}">
							{uploadResult.message}
						</p>
						
						{#if uploadResult.success && uploadResult.insights}
							<div class="mt-4 space-y-3">
								<div class="grid grid-cols-2 gap-4 text-sm">
									<div>
										<span class="text-gray-600">Mensajes analizados:</span>
										<span class="font-medium text-green-700 ml-1">{uploadResult.insights.totalMessages}</span>
									</div>
									<div>
										<span class="text-gray-600">Tasa de conversión:</span>
										<span class="font-medium text-green-700 ml-1">{uploadResult.insights.conversionRate}%</span>
									</div>
								</div>
								
								<div>
									<p class="text-sm text-gray-600 mb-2">Técnicas exitosas identificadas:</p>
									<div class="flex flex-wrap gap-2">
										{#each uploadResult.insights.successfulTechniques as technique}
											<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
												{technique}
											</span>
										{/each}
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Historial de entrenamiento -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-200">
		<div class="p-6 border-b border-gray-200">
			<h2 class="text-xl font-semibold text-gray-900">📚 Historial de Entrenamiento</h2>
		</div>
		<div class="p-6">
			{#if isLoadingHistory}
				<div class="flex items-center justify-center py-8">
					<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
					<span class="ml-2 text-gray-600">Cargando historial...</span>
				</div>
			{:else if trainingHistory.length > 0}
				<div class="space-y-4">
					{#each trainingHistory as item}
						<div class="p-4 bg-gray-50 rounded-lg">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<p class="font-medium text-gray-900">{item.filename}</p>
									<p class="text-sm text-gray-600">
										Subido: {new Date(item.uploadDate).toLocaleDateString('es-ES')}
									</p>
									
									{#if item.insights}
										<div class="mt-3 grid grid-cols-2 gap-4 text-sm">
											<div>
												<span class="text-gray-600">Mensajes:</span>
												<span class="font-medium ml-1">{item.insights.totalMessages}</span>
											</div>
											<div>
												<span class="text-gray-600">Conversión:</span>
												<span class="font-medium text-green-600 ml-1">{item.insights.conversionRate}%</span>
											</div>
										</div>
										
										<div class="mt-2">
											<p class="text-xs text-gray-600 mb-1">Técnicas aprendidas:</p>
											<div class="flex flex-wrap gap-1">
												{#each item.insights.successfulTechniques as technique}
													<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
														{technique}
													</span>
												{/each}
											</div>
										</div>
									{/if}
								</div>
								
								<div class="ml-4">
									<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
										{item.status === 'processed' ? 'Procesado' : 'Pendiente'}
									</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-8 text-gray-500">
					<div class="text-4xl mb-2">📚</div>
					<p class="text-sm">No hay conversaciones entrenadas aún</p>
				</div>
			{/if}
		</div>
	</div>
</div>