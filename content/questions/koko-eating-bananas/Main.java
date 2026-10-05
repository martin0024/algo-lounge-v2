import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        JsonArray jp = in.get(0).getAsJsonArray();
        int[] piles = new int[jp.size()];
        for (int i = 0; i < jp.size(); i++) piles[i] = jp.get(i).getAsInt();
        int h = in.get(1).getAsInt();

        int result = new Solution().minEatingSpeed(piles, h);
        System.out.println(new Gson().toJson(result));
    }
}
