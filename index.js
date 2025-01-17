require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors")

const prisma = new PrismaClient();
const app = express();


app.use(express.json());
app.use(cors()); // Permite todas as origens

app.get("/", (req, res) => {
    res.json("Olá mundo!")
})


// Criar uma nova nota
app.post("/create", async (req, res) => {
  const { content, durationInMinutes } = req.body;

  if (!content || !durationInMinutes) {
    return res.status(400).json({ error: "Conteúdo e duração são obrigatórios." });
  }

  const expiresAt = new Date(Date.now() + durationInMinutes * 60 * 1000);

  try {
    const note = await prisma.note.create({
      data: {
        content,
        expiresAt,
      },
    });

    res.status(201).json({ link: `/view/${note.id}` });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar a nota." });
  }
});

// Recuperar e excluir uma nota após visualização
app.get("/view/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const note = await prisma.note.findUnique({
      where: { id: parseInt(id) },
    });

    if (!note) {
      return res.status(404).json({ error: "Nota não encontrada ou já foi visualizada." });
    }

    if (note.hasBeenViewed || new Date() > note.expiresAt) {
      await prisma.note.delete({ where: { id: parseInt(id) } });
      return res.status(404).json({ error: "Nota não encontrada ou já foi visualizada." });
    }

    await prisma.note.update({
      where: { id: parseInt(id) },
      data: { hasBeenViewed: true },
    });

    res.json({ content: note.content });
  } catch (err) {
    res.status(500).json({ error: "Erro ao recuperar a nota." });
  }
});

// Remover notas expiradas periodicamente
setInterval(async () => {
  try {
    await prisma.note.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    console.log("Notas expiradas removidas.");
  } catch (err) {
    console.error("Erro ao remover notas expiradas:", err);
  }
}, 60000); // A cada 60 segundos

// Iniciar o servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
