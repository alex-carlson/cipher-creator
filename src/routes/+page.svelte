<script lang="ts">
    import CipherList from "../components/CipherList.svelte";
</script>

<main class="page">
    <section class="hero">
        <p>Greetings Codebreaker! Here's the latest transmissions</p>
        <CipherList limit={4} />
        <p>
            Or you can <a href="/browse">browse all</a>
        </p>
    </section>
</main>
