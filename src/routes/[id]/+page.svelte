<script lang="ts">
	import { page } from '$app/state';

	const cipherId = $derived(page.params.id);
</script>

<section class="page-shell">
	<h1>Cipher #{cipherId}</h1>
	<p>View and use this cipher instance here.</p>
</section>
