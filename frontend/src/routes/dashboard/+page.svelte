<script>
	import { onMount } from 'svelte';

	let dashboardData = null;
	let isLoading = true;

	// API Base URL
	const API_BASE = typeof window !== 'undefined' 
		? (window.location.hostname === 'localhost' ? 'http://localhost:3000' : '')
		: '';

	async function loadDashboard() {
		isLoading = true;
		try {
			const response = await fetch(`${API_BASE}/api/analytics/dashboard`);
			if (response.ok) {
				dashboardData = await response.json();
			} else {
				// Datos de ejemplo si no hay backend
				dashboardData = {
					conversationsToday: 12,
					qualifiedLeads: 8,
					averageScore: 75,
					conversionRate: 24,
					topProspects: [
						{
							customerId: 'cliente_001',
							lastActivity: new Date(Date.now() - 3600000),
							score: 85,
							probability: 78
						},
						{
							customerId: 'cliente_002',
							lastActivity: new Date(Date.now() - 7200000),
							score: 72,
							probability: 65
						}
					],
					recentActivity: [
						{
							id: 1,
							type: 'conversation',
							customerId: 'cliente_003',
							timestamp: new Date(Date.now() - 1800000),
							summary: 'Consulta sobre laptops gaming'
						},
						{
							id: 2,
							type: 'lead_qualified',
							customerId: 'cliente_001',
							timestamp: new Date(Date.now() - 3600000),
							summary: 'Lead calificado - interés alto en Laptop Pro'
						}
					]
				};
			}
		} catch (error) {
			console.error('Error loading dashboard:', error);
			// Datos de ejemplo en caso de error
			dashboardData = {
				conversationsToday: 0,
				qualifiedLeads: 0,
				averageScore: 0,
				conversionRate: 0,
				topProspects: [],
				recentActivity: []
			};
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadDashboard();
	});
</script>

<svelte:head>
	<title>Dashboard - Vendex AI</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
			<p class="text-gray-600 mt-1">Resumen de actividad y métricas de ventas</p>
		</div>
		<button 
			on:click={loadDashboard}
			class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
		>
			🔄 Actualizar
		</button>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-3 text-gray-600">Cargando dashboard...</span>
		</div>
	{:else if dashboardData}
		<!-- Métricas principales -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div class="flex items-center">
					<div class="p-3 bg-blue-100 rounded-lg">
						<span class="text-2xl">💬</span>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Conversaciones Hoy</p>
						<p class="text-2xl font-bold text-gray-900">{dashboardData.conversationsToday}</p>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div class="flex items-center">
					<div class="p-3 bg-green-100 rounded-lg">
						<span class="text-2xl">🎯</span>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Leads Calificados</p>
						<p class="text-2xl font-bold text-gray-900">{dashboardData.qualifiedLeads}</p>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div class="flex items-center">
					<div class="p-3 bg-yellow-100 rounded-lg">
						<span class="text-2xl">⭐</span>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Score Promedio</p>
						<p class="text-2xl font-bold text-gray-900">{dashboardData.averageScore}</p>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div class="flex items-center">
					<div class="p-3 bg-purple-100 rounded-lg">
						<span class="text-2xl">📈</span>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Tasa de Conversión</p>
						<p class="text-2xl font-bold text-gray-900">{dashboardData.conversionRate}%</p>
					</div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Top Prospects -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-200">
				<div class="p-6 border-b border-gray-200">
					<h2 class="text-xl font-semibold text-gray-900">🏆 Top Prospects</h2>
				</div>
				<div class="p-6">
					{#if dashboardData.topProspects && dashboardData.topProspects.length > 0}
						<div class="space-y-4">
							{#each dashboardData.topProspects as prospect}
								<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
									<div>
										<p class="font-medium text-gray-900">{prospect.customerId}</p>
										<p class="text-sm text-gray-600">
											Última actividad: {new Date(prospect.lastActivity).toLocaleDateString('es-ES')}
										</p>
									</div>
									<div class="text-right">
										<p class="text-lg font-bold text-green-600">{prospect.score}/100</p>
										<p class="text-sm text-gray-600">{prospect.probability}% prob.</p>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center py-8 text-gray-500">
							<div class="text-4xl mb-2">🎯</div>
							<p class="text-sm">No hay prospects disponibles</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Actividad Reciente -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-200">
				<div class="p-6 border-b border-gray-200">
					<h2 class="text-xl font-semibold text-gray-900">📋 Actividad Reciente</h2>
				</div>
				<div class="p-6">
					{#if dashboardData.recentActivity && dashboardData.recentActivity.length > 0}
						<div class="space-y-4">
							{#each dashboardData.recentActivity as activity}
								<div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
									<div class="p-2 bg-blue-100 rounded-lg">
										<span class="text-sm">
											{activity.type === 'conversation' ? '💬' : '🎯'}
										</span>
									</div>
									<div class="flex-1">
										<p class="text-sm font-medium text-gray-900">{activity.customerId}</p>
										<p class="text-xs text-gray-600">{activity.summary}</p>
										<p class="text-xs text-gray-500 mt-1">
											{new Date(activity.timestamp).toLocaleString('es-ES')}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center py-8 text-gray-500">
							<div class="text-4xl mb-2">📋</div>
							<p class="text-sm">No hay actividad reciente</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="text-center py-12">
			<div class="text-6xl mb-4">📊</div>
			<h2 class="text-xl font-semibold text-gray-900 mb-2">No hay datos disponibles</h2>
			<p class="text-gray-600">Inicia algunas conversaciones para ver las métricas aquí.</p>
		</div>
	{/if}
</div>