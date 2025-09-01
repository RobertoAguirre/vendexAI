<script>
	import { createEventDispatcher } from 'svelte';
	
	export let selectedBusinessId = '';
	export let businesses = [];
	
	const dispatch = createEventDispatcher();
	
	function selectBusiness(businessId) {
		selectedBusinessId = businessId;
		dispatch('change', { businessId });
	}
	
	// Negocios de ejemplo para pruebas
	const demoBusinesses = [
		{
			businessId: '6852153db671984b247ca2b2',
			name: 'Florería Vendex',
			industry: 'flowers',
			description: 'Tienda de flores y arreglos florales',
			productCount: 256
		},
		{
			businessId: 'tech_store_001',
			name: 'TechStore',
			industry: 'technology',
			description: 'Tienda de tecnología y computadoras',
			productCount: 3
		},
		{
			businessId: 'clothing_store_001',
			name: 'Fashion Boutique',
			industry: 'clothing',
			description: 'Boutique de ropa y accesorios',
			productCount: 0
		}
	];
	
	// Usar negocios de ejemplo si no hay datos
	$: displayBusinesses = businesses.length > 0 ? businesses : demoBusinesses;
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
	<h3 class="text-sm font-medium text-gray-700 mb-3">🏢 Seleccionar Negocio</h3>
	
	<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
		{#each displayBusinesses as business}
			<button
				on:click={() => selectBusiness(business.businessId)}
				class="p-3 rounded-lg border-2 transition-all {
					selectedBusinessId === business.businessId
						? 'border-blue-500 bg-blue-50'
						: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
				}"
			>
				<div class="flex items-center space-x-3">
					<div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
						<span class="text-white text-xs font-bold">
							{business.industry === 'flowers' ? '🌸' : 
							 business.industry === 'technology' ? '💻' : 
							 business.industry === 'clothing' ? '👗' : '🏢'}
						</span>
					</div>
					<div class="flex-1 text-left">
						<p class="text-sm font-medium text-gray-900">{business.name}</p>
						<p class="text-xs text-gray-600">{business.description}</p>
						<p class="text-xs text-blue-600 font-medium">{business.productCount} productos</p>
					</div>
					{#if selectedBusinessId === business.businessId}
						<div class="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
							<span class="text-white text-xs">✓</span>
						</div>
					{/if}
				</div>
			</button>
		{/each}
	</div>
	
	{#if selectedBusinessId}
		<div class="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
			<p class="text-xs text-green-800">
				✅ Negocio seleccionado: <span class="font-medium">{selectedBusinessId}</span>
			</p>
		</div>
	{/if}
</div>
