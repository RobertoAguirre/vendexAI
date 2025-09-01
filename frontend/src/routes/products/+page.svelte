<script>
	import { onMount } from 'svelte';

	let products = [];
	let isLoading = true;
	let selectedCategory = 'all';

	// API Base URL
	const API_BASE = typeof window !== 'undefined' 
		? (window.location.hostname === 'localhost' ? 'http://localhost:3000' : '')
		: '';

	const categories = [
		{ id: 'all', name: 'Todos', icon: '🛍️' },
		{ id: 'laptops', name: 'Laptops', icon: '💻' },
		{ id: 'monitors', name: 'Monitores', icon: '🖥️' },
		{ id: 'accessories', name: 'Accesorios', icon: '⌨️' }
	];

	async function loadProducts() {
		isLoading = true;
		try {
			const response = await fetch(`${API_BASE}/api/products`);
			if (response.ok) {
				products = await response.json();
			} else {
				// Datos de ejemplo si no hay backend
				products = [
					{
						id: 1,
						name: 'Laptop Pro 15"',
						category: 'laptops',
						price: 1299.99,
						description: 'Laptop profesional con procesador Intel i7, 16GB RAM, 512GB SSD',
						image: '💻',
						stock: 15,
						features: ['Intel i7-12700H', '16GB DDR4', '512GB NVMe SSD', '15.6" FHD']
					},
					{
						id: 2,
						name: 'Laptop Gaming 17"',
						category: 'laptops',
						price: 1899.99,
						description: 'Laptop gaming con RTX 4060, 32GB RAM, 1TB SSD',
						image: '🎮',
						stock: 8,
						features: ['RTX 4060', '32GB DDR5', '1TB NVMe SSD', '17.3" QHD 165Hz']
					},
					{
						id: 3,
						name: 'Monitor 27" 4K',
						category: 'monitors',
						price: 449.99,
						description: 'Monitor profesional 4K con pantalla IPS',
						image: '🖥️',
						stock: 25,
						features: ['27" 4K UHD', 'IPS Panel', 'HDR400', 'USB-C']
					},
					{
						id: 4,
						name: 'Monitor Gaming 24"',
						category: 'monitors',
						price: 299.99,
						description: 'Monitor gaming 144Hz con tiempo de respuesta 1ms',
						image: '🎯',
						stock: 20,
						features: ['24" FHD', '144Hz', '1ms Response', 'FreeSync']
					},
					{
						id: 5,
						name: 'Teclado Mecánico RGB',
						category: 'accessories',
						price: 89.99,
						description: 'Teclado mecánico con switches Cherry MX Red',
						image: '⌨️',
						stock: 50,
						features: ['Cherry MX Red', 'RGB Backlight', 'Aluminum Frame', 'USB-C']
					},
					{
						id: 6,
						name: 'Mouse Gaming Wireless',
						category: 'accessories',
						price: 69.99,
						description: 'Mouse gaming inalámbrico con sensor 25K DPI',
						image: '🖱️',
						stock: 35,
						features: ['25K DPI Sensor', 'Wireless 2.4GHz', 'RGB', '70h Battery']
					}
				];
			}
		} catch (error) {
			console.error('Error loading products:', error);
			products = [];
		} finally {
			isLoading = false;
		}
	}

	function getFilteredProducts() {
		if (selectedCategory === 'all') {
			return products;
		}
		return products.filter(product => product.category === selectedCategory);
	}

	function formatPrice(price) {
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}

	onMount(() => {
		loadProducts();
	});
</script>

<svelte:head>
	<title>Productos - Vendex AI</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="text-center">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Catálogo de Productos</h1>
		<p class="text-gray-600">Explora nuestra selección de productos de alta calidad</p>
	</div>

	<!-- Filtros por categoría -->
	<div class="flex flex-wrap justify-center gap-2">
		{#each categories as category}
			<button
				on:click={() => selectedCategory = category.id}
				class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {
					selectedCategory === category.id
						? 'bg-blue-500 text-white'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
				}"
			>
				<span class="mr-2">{category.icon}</span>
				{category.name}
			</button>
		{/each}
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-3 text-gray-600">Cargando productos...</span>
		</div>
	{:else if getFilteredProducts().length > 0}
		<!-- Grid de productos -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each getFilteredProducts() as product}
				<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
					<!-- Imagen del producto -->
					<div class="h-48 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
						<span class="text-6xl">{product.image}</span>
					</div>
					
					<!-- Información del producto -->
					<div class="p-6">
						<div class="flex items-start justify-between mb-2">
							<h3 class="text-lg font-semibold text-gray-900">{product.name}</h3>
							<span class="text-2xl font-bold text-blue-600">{formatPrice(product.price)}</span>
						</div>
						
						<p class="text-gray-600 text-sm mb-4">{product.description}</p>
						
						<!-- Características -->
						<div class="mb-4">
							<h4 class="text-sm font-medium text-gray-700 mb-2">Características:</h4>
							<ul class="space-y-1">
								{#each product.features as feature}
									<li class="text-xs text-gray-600 flex items-center">
										<span class="w-1 h-1 bg-blue-500 rounded-full mr-2"></span>
										{feature}
									</li>
								{/each}
							</ul>
						</div>
						
						<!-- Stock y acción -->
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-500">
								Stock: <span class="font-medium {product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'}">{product.stock} unidades</span>
							</span>
							<button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
								Ver detalles
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12">
			<div class="text-6xl mb-4">📦</div>
			<h2 class="text-xl font-semibold text-gray-900 mb-2">No hay productos disponibles</h2>
			<p class="text-gray-600">No se encontraron productos en esta categoría.</p>
		</div>
	{/if}
</div>
