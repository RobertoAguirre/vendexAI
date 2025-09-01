<script>
	import { createEventDispatcher } from 'svelte';
	
	export let isOpen = false;
	
	const dispatch = createEventDispatcher();
	
	function closeMenu() {
		dispatch('close');
	}
</script>

{#if isOpen}
	<!-- Overlay -->
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 z-40"
		on:click={closeMenu}
	></div>
	
	<!-- Menú móvil -->
	<div class="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 z-50 transform transition-transform duration-300 {isOpen ? 'translate-y-0' : '-translate-y-full'}">
		<nav class="px-4 py-6 space-y-4">
			<a 
				href="/" 
				class="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
				on:click={closeMenu}
			>
				<span class="text-xl">💬</span>
				<span class="font-medium">Chat</span>
			</a>
			
			<a 
				href="/products" 
				class="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
				on:click={closeMenu}
			>
				<span class="text-xl">🛍️</span>
				<span class="font-medium">Productos</span>
			</a>
			
			<a 
				href="/dashboard" 
				class="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
				on:click={closeMenu}
			>
				<span class="text-xl">📊</span>
				<span class="font-medium">Dashboard</span>
			</a>
			
			<a 
				href="/admin" 
				class="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
				on:click={closeMenu}
			>
				<span class="text-xl">⚙️</span>
				<span class="font-medium">Admin</span>
			</a>
		</nav>
	</div>
{/if}
