import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ChatbotService } from '../../services/chatbot.service';
import { AuthService } from '../../services/auth.service';
import { ChatbotConfig } from '../../models/chatbot.model';

interface Message {
  question: string;
  answer: string;
  timestamp: string;
  isUser: boolean;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatbotService = inject(ChatbotService);
  public authService = inject(AuthService);

  chatbots = signal<ChatbotConfig[]>([]);
  activeChatbotId = signal('');
  joinCode = signal('');
  currentQuestion = signal('');
  messages = signal<Message[]>([]);
  loading = signal(false);
  joining = signal(false);
  bootLoading = signal(false);
  error = signal<string | null>(null);

  activeChatbot = computed(() => this.chatbots().find(bot => bot.id === this.activeChatbotId()) ?? null);
  chatbotUnavailableMessage = computed(() => {
    const chatbot = this.activeChatbot();
    if (!chatbot) return 'Selecione um chatbot para enviar perguntas.';
    if (!this.isChatbotActive(chatbot)) return 'Este chatbot esta inativo no momento. Peca para um admin ativa-lo.';
    if (chatbot.availableNow === false) return 'Este chatbot esta fora do horario configurado.';
    return null;
  });

  ngOnInit(): void {
    const routeChatbotId = this.route.snapshot.paramMap.get('chatbotId');
    this.loadMyChatbots(routeChatbotId ?? undefined);
  }

  loadMyChatbots(preferredId?: string): void {
    this.bootLoading.set(true);
    this.error.set(null);
    this.chatbotService.getMyChatbots().subscribe({
      next: (chatbots) => {
        this.chatbots.set(chatbots);
        const selected = preferredId && chatbots.some(bot => bot.id === preferredId)
          ? preferredId
          : chatbots[0]?.id ?? '';
        this.bootLoading.set(false);
        if (selected) {
          this.selectChatbot(selected);
        }
      },
      error: (err) => {
        this.bootLoading.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar seus chatbots'));
      }
    });
  }

  joinChatbot(): void {
    const code = this.joinCode().trim().toUpperCase();
    if (!code) {
      this.error.set('Digite o codigo do chatbot');
      return;
    }

    this.joining.set(true);
    this.error.set(null);
    this.chatbotService.joinByCode({ code }).subscribe({
      next: (chatbot) => {
        this.joining.set(false);
        this.joinCode.set('');
        this.chatbots.update(list =>
          list.some(item => item.id === chatbot.id)
            ? list.map(item => item.id === chatbot.id ? chatbot : item)
            : [chatbot, ...list]
        );
        this.selectChatbot(chatbot.id);
      },
      error: (err) => {
        this.joining.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Codigo invalido ou expirado'));
      }
    });
  }

  selectChatbot(chatbotId: string): void {
    const id = chatbotId?.trim();
    if (!id) {
      this.error.set('Nao foi possivel abrir este chatbot. Tente entrar novamente pelo codigo.');
      return;
    }

    this.activeChatbotId.set(id);
    this.messages.set([]);
    this.router.navigate(['/chatbots', id], { replaceUrl: true }).catch(() => {
      this.error.set('Nao foi possivel atualizar a rota do chatbot.');
    });
    this.chatbotService.getMyChatHistory(id).subscribe({
      next: (history) => {
        const messages: Message[] = [];
        history.forEach(item => {
          messages.push({
            question: item.question,
            answer: '',
            timestamp: item.askedAt || item.answeredAt || new Date().toISOString(),
            isUser: true
          });
          if (item.answer) {
            messages.push({
              question: item.question,
              answer: item.answer,
              timestamp: item.answeredAt || item.askedAt || new Date().toISOString(),
              isUser: false
            });
          }
        });
        this.messages.set(messages);
      },
      error: () => this.messages.set([])
    });
  }

  canSendMessage(): boolean {
    const chatbot = this.activeChatbot();
    return Boolean(chatbot && this.isChatbotActive(chatbot) && chatbot.availableNow !== false);
  }

  sendMessage(): void {
    const chatbotId = this.activeChatbotId();
    const question = this.currentQuestion().trim();
    if (!chatbotId || !question || this.loading()) return;
    if (!this.canSendMessage()) {
      this.error.set(this.chatbotUnavailableMessage());
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.currentQuestion.set('');
    this.messages.update(messages => [
      ...messages,
      { question, answer: '', timestamp: new Date().toISOString(), isUser: true }
    ]);

    this.chatbotService.ask(chatbotId, { question }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.messages.update(messages => [
          ...messages,
          {
            question: response.question || question,
            answer: response.answer || 'Nao consegui responder agora. Tente novamente em instantes.',
            timestamp: response.answeredAt || new Date().toISOString(),
            isUser: false
          }
        ]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao enviar pergunta'));
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  goToSpaces(): void {
    this.router.navigate(['/app/home']);
  }

  displayChatbotName(chatbot: ChatbotConfig | null): string {
    return chatbot?.name?.trim() || 'Chatbot sem nome';
  }

  chatbotSubtitle(chatbot: ChatbotConfig): string | null {
    return chatbot.requirementSetName || chatbot.workspaceName || null;
  }

  private getUserFriendlyError(err: any, fallback: string): string {
    const msg = err.error?.message;
    if (msg && typeof msg === 'string') return msg;
    if (err.message && typeof err.message === 'string') return err.message;
    return fallback;
  }

  private isChatbotActive(chatbot: ChatbotConfig): boolean {
    return chatbot.isActive === true || chatbot.active === true;
  }
}
