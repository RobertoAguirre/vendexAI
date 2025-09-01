<script>
	export let metrics = {
		leadScore: 0,
		conversionProbability: 0,
		sentiment: 'neutral'
	};
	
	function getSentimentColor(sentiment) {
		switch (sentiment) {
			case 'positive':
				return 'text-green-600';
			case 'negative':
				return 'text-red-600';
			case 'neutral':
			default:
				return 'text-blue-600';
		}
	}
	
	function getSentimentIcon(sentiment) {
		switch (sentiment) {
			case 'positive':
				return '😊';
			case 'negative':
				return '😔';
			case 'neutral':
			default:
				return '😐';
		}
	}
</script>

<div class="bg-blue-50 rounded-lg p-3 border border-blue-100">
	<div class="grid grid-cols-2 gap-3 text-xs">
		<div class="text-center">
			<div class="font-bold text-blue-700">Lead Score</div>
			<div class="text-lg font-bold text-blue-800">{metrics.leadScore}/100</div>
		</div>
		<div class="text-center">
			<div class="font-bold text-green-700">Conversión</div>
			<div class="text-lg font-bold text-green-800">{metrics.conversionProbability}%</div>
		</div>
		<div class="col-span-2 text-center">
			<div class="font-bold text-gray-700">Sentimiento</div>
			<div class="flex items-center justify-center space-x-1">
				<span class="text-sm">{getSentimentIcon(metrics.sentiment)}</span>
				<span class="font-medium capitalize {getSentimentColor(metrics.sentiment)}">
					{metrics.sentiment}
				</span>
			</div>
		</div>
	</div>
</div>
