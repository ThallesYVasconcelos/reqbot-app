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
      this.error.set('Digite o código do chatbot');
      return;
    }

    this.joining.set(true);
    this.error.set(null);
    this.chatbotService.joinByCode({ code }).subscribe({
      next: (chatbot) => {
        this.joining.set(false);
        this.joinCode.set('');
        this.chatbots.update(list => list.some(item => item.id === chatbot.id) ? list : [chatbot, ...list]);
        this.selectChatbot(chatbot.id);
      },
      error: (err) => {
        this.joining.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Código inválido ou expirado'));
      }
    });
  }

  selectChatbot(chatbotId: string): void {
    this.activeChatbotId.set(chatbotId);
    this.messages.set([]);
    this.router.navigate(['/chatbots', chatbotId], { replaceUrl: true });
    this.chatbotService.getMyChatHistory(chatbotId).subscribe({
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
    return Boolean(chatbot && (chatbot.isActive ?? chatbot.active) && chatbot.availableNow !== false);
  }

  sendMessage(): void {
    const chatbotId = this.activeChatbotId();
    const question = this.currentQuestion().trim();
    if (!chatbotId || !question || this.loading()) return;

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
            answer: response.answer || 'Não consegui responder agora. Tente novamente em instantes.',
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
    this.router.navigate(['/app/spaces']);
  }

  private getUserFriendlyError(err: any, fallback: string): string {
    const msg = err.error?.message;
    if (msg && typeof msg === 'string') return msg;
    if (err.message && typeof err.message === 'string') return err.message;
    return fallback;
  }
}
